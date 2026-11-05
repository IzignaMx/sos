"""Refina los materiales y la superficie de la escultura original de SOS.

Uso (Python 3.12):
    python -m pip install -r .github/scripts/requirements-hero.txt
    python .github/scripts/refine-hero-model.py original.glb refinado.glb

El archivo de entrada es el GLB original de Higgsfield/Tripo, con su albedo
2048 × 2048. La clasificación está diseñada para esta escultura y sus ejes;
no es un conversor genérico. Sólo se leen muestras de la imagen de origen.
El resultado contiene colores por vértice, sin imágenes raster modificadas.
"""

import argparse
import hashlib
import io
import json
from pathlib import Path
import struct

import numpy as np
from PIL import Image
from scipy.sparse import coo_matrix, diags


def leer_glb(ruta):
    datos = Path(ruta).read_bytes()
    if len(datos) < 20 or struct.unpack_from("<III", datos) != (
        0x46546C67,
        2,
        len(datos),
    ):
        raise ValueError("Se requiere un contenedor GLB 2.0 válido.")
    documento = binario = None
    inicio = 12
    while inicio < len(datos):
        longitud, tipo = struct.unpack_from("<II", datos, inicio)
        inicio += 8
        contenido = datos[inicio : inicio + longitud]
        if len(contenido) != longitud:
            raise ValueError("El GLB contiene un bloque truncado.")
        if tipo == 0x4E4F534A:
            documento = json.loads(contenido)
        elif tipo == 0x004E4942:
            binario = contenido
        inicio += longitud
    if documento is None or binario is None:
        raise ValueError("El GLB debe incluir metadatos y un bloque binario.")
    return documento, binario, hashlib.sha256(datos).hexdigest()


def leer_accesor(documento, binario, indice):
    accesor = documento["accessors"][indice]
    vista = documento["bufferViews"][accesor["bufferView"]]
    if "sparse" in accesor:
        raise ValueError("El origen esperado no usa accesores dispersos.")
    componentes = {"SCALAR": 1, "VEC2": 2, "VEC3": 3}[accesor["type"]]
    tipo = np.dtype({5123: "<u2", 5125: "<u4", 5126: "<f4"}[accesor["componentType"]])
    desplazamiento = vista.get("byteOffset", 0) + accesor.get("byteOffset", 0)
    paso = vista.get("byteStride", componentes * tipo.itemsize)
    return np.ndarray(
        (accesor["count"], componentes),
        dtype=tipo,
        buffer=binario,
        offset=desplazamiento,
        strides=(paso, tipo.itemsize),
    ).copy()


def leer_origen(documento, binario):
    if len(documento["meshes"]) != 1 or len(documento["meshes"][0]["primitives"]) != 1:
        raise ValueError("Se espera la única primitiva del modelo original de SOS.")
    primitiva = documento["meshes"][0]["primitives"][0]
    if primitiva.get("mode", 4) != 4:
        raise ValueError("La geometría debe estar triangulada.")
    atributos = primitiva["attributes"]
    posiciones = leer_accesor(documento, binario, atributos["POSITION"])
    normales = leer_accesor(documento, binario, atributos["NORMAL"])
    uv = leer_accesor(documento, binario, atributos["TEXCOORD_0"])
    caras = leer_accesor(documento, binario, primitiva["indices"]).reshape(-1, 3)
    if len(posiciones) != 22335 or len(caras) != 39696:
        raise ValueError("La topología no corresponde a la escultura original de SOS.")
    material = documento["materials"][primitiva["material"]]
    textura = documento["textures"][
        material["pbrMetallicRoughness"]["baseColorTexture"]["index"]
    ]
    imagen = documento["images"][textura["source"]]
    vista = documento["bufferViews"][imagen["bufferView"]]
    inicio = vista.get("byteOffset", 0)
    with Image.open(
        io.BytesIO(binario[inicio : inicio + vista["byteLength"]])
    ) as original:
        if original.size != (2048, 2048):
            raise ValueError(
                "Usa el original con albedo 2048 × 2048, no la versión web anterior."
            )
        albedo = np.asarray(original.convert("RGB")).astype(float)
    return posiciones, normales, uv, caras, albedo


def suavizar_superficie(posiciones, caras):
    original = posiciones.astype(float)
    _, primera, inversa = np.unique(
        original.round(6), axis=0, return_index=True, return_inverse=True
    )
    vertices = original[primera].copy()
    triangulos = inversa[caras]
    aristas = np.sort(
        np.concatenate(
            [triangulos[:, [0, 1]], triangulos[:, [1, 2]], triangulos[:, [2, 0]]]
        ),
        axis=1,
    )
    aristas, cuentas = np.unique(aristas, axis=0, return_counts=True)
    if not np.all(cuentas == 2):
        raise ValueError("La superficie soldada debe ser cerrada.")
    filas = np.concatenate([aristas[:, 0], aristas[:, 1]])
    columnas = np.concatenate([aristas[:, 1], aristas[:, 0]])
    adyacencia = coo_matrix(
        (np.ones(len(filas)), (filas, columnas)), shape=(len(vertices), len(vertices))
    ).tocsr()
    promedio = diags(1 / np.asarray(adyacencia.sum(1)).ravel()) @ adyacencia

    def volumen(v):
        return (
            np.einsum(
                "ij,ij->i",
                v[triangulos[:, 0]],
                np.cross(v[triangulos[:, 1]], v[triangulos[:, 2]]),
            ).sum()
            / 6
        )

    inicial = vertices.copy()
    volumen_original = volumen(inicial)
    # Ocho pares Taubin: la pasada negativa compensa la contracción de la positiva.
    for _ in range(8):
        vertices += 0.45 * (promedio @ vertices - vertices)
        vertices -= 0.47 * (promedio @ vertices - vertices)
    objetivo = vertices.copy()
    factores = np.ones(len(vertices))
    normales_cara_original = np.cross(
        inicial[triangulos[:, 1]] - inicial[triangulos[:, 0]],
        inicial[triangulos[:, 2]] - inicial[triangulos[:, 0]],
    )
    # Atenuar localmente el desplazamiento de caras estrechas para no invertirlas.
    for _ in range(16):
        normales_cara = np.cross(
            vertices[triangulos[:, 1]] - vertices[triangulos[:, 0]],
            vertices[triangulos[:, 2]] - vertices[triangulos[:, 0]],
        )
        cosenos = (normales_cara_original * normales_cara).sum(1) / (
            np.linalg.norm(normales_cara_original, axis=1)
            * np.linalg.norm(normales_cara, axis=1)
        )
        restringidas = cosenos < 0.25
        if not restringidas.any():
            break
        factores[np.unique(triangulos[restringidas])] *= 0.6
        vertices = inicial + (objetivo - inicial) * factores[:, None]
    normales_cara = np.cross(
        vertices[triangulos[:, 1]] - vertices[triangulos[:, 0]],
        vertices[triangulos[:, 2]] - vertices[triangulos[:, 0]],
    )
    if not np.all((normales_cara * normales_cara_original).sum(1) > 0):
        raise ValueError("El refinamiento no debe invertir ni degenerar caras.")

    # Normales ponderadas por el ángulo de cada esquina, continuas entre islas UV.
    normales = np.zeros_like(vertices)
    puntos = vertices[triangulos]
    normales_cara /= np.linalg.norm(normales_cara, axis=1)[:, None]
    for esquina in range(3):
        arista_a = puntos[:, (esquina + 1) % 3] - puntos[:, esquina]
        arista_b = puntos[:, (esquina + 2) % 3] - puntos[:, esquina]
        cosenos = (arista_a * arista_b).sum(1) / (
            np.linalg.norm(arista_a, axis=1) * np.linalg.norm(arista_b, axis=1)
        )
        angulos = np.arccos(np.clip(cosenos, -1, 1))
        np.add.at(normales, triangulos[:, esquina], normales_cara * angulos[:, None])
    normales /= np.linalg.norm(normales, axis=1)[:, None]
    nuevas = vertices[inversa]
    distancia = np.linalg.norm(nuevas - original, axis=1)
    diagonal = np.linalg.norm(np.ptp(original, axis=0))
    estadisticas = {
        "paresTaubin": 8,
        "lambda": 0.45,
        "mu": -0.47,
        "verticesLimitadosPorOrientacion": int((factores < 1).sum()),
        "desviacionRMS": float(np.sqrt(np.mean(distancia**2))),
        "desviacionMaxima": float(distancia.max()),
        "rmsPorcentajeDiagonal": float(np.sqrt(np.mean(distancia**2)) / diagonal * 100),
        "maximoPorcentajeDiagonal": float(distancia.max() / diagonal * 100),
        "cambioVolumenPorcentaje": float(
            (volumen(vertices) / volumen_original - 1) * 100
        ),
    }
    return nuevas.astype("<f4"), normales[inversa].astype("<f4"), estadisticas


def colores_continuos(posiciones, normales, uv, caras, imagen):
    # Leer el albedo por interpolación bilineal; nunca se escribe una imagen nueva.
    puntos = uv * np.array([imagen.shape[1] - 1, imagen.shape[0] - 1])
    piso = np.floor(puntos).astype(int)
    techo = np.minimum(piso + 1, np.array([imagen.shape[1] - 1, imagen.shape[0] - 1]))
    fraccion = puntos - piso
    superior = (
        imagen[piso[:, 1], piso[:, 0]] * (1 - fraccion[:, 0, None])
        + imagen[piso[:, 1], techo[:, 0]] * fraccion[:, 0, None]
    )
    inferior = (
        imagen[techo[:, 1], piso[:, 0]] * (1 - fraccion[:, 0, None])
        + imagen[techo[:, 1], techo[:, 0]] * fraccion[:, 0, None]
    )
    rojo, verde, azul_original = (
        superior * (1 - fraccion[:, 1, None]) + inferior * fraccion[:, 1, None]
    ).T
    limitar = lambda valores: np.clip(valores, 0, 1)
    # Priorizar el cian evita confundir el surco con las caras interiores de cobalto.
    cian = (
        limitar((verde / (azul_original + 1) - 0.55) / 0.09)
        * limitar((0.42 - rojo / (azul_original + 1)) / 0.12)
        * limitar((azul_original - rojo - 20) / 25)
    )
    azul = limitar((azul_original - rojo - 16) / 24) * limitar(
        (azul_original - verde - 10) / 22
    )
    interior = limitar((0.17 - np.sum(posiciones * normales, axis=1)) / 0.04)
    azul = np.maximum(azul, interior) * (1 - cian)
    pesos = np.column_stack((1 - cian - azul, azul, cian))

    _, inversa = np.unique(posiciones.round(6), axis=0, return_inverse=True)
    cantidad = inversa.max() + 1
    continuos = np.zeros((cantidad, 3))
    np.add.at(continuos, inversa, pesos)
    continuos /= np.bincount(inversa)[:, None]
    triangulos = inversa[caras]
    aristas = np.concatenate(
        (triangulos[:, [0, 1]], triangulos[:, [1, 2]], triangulos[:, [2, 0]])
    )
    aristas = np.concatenate((aristas, aristas[:, ::-1]))
    adyacencia = coo_matrix(
        (np.ones(len(aristas)), (aristas[:, 0], aristas[:, 1])),
        shape=(cantidad, cantidad),
    ).tocsr()
    adyacencia.data[:] = 1
    grados = np.asarray(adyacencia.sum(1)).ravel()
    inicial = continuos.copy()
    # Mezclar a través de la geometría elimina dientes sin difuminar un atlas raster.
    for _ in range(2):
        continuos = 0.65 * continuos + 0.35 * (adyacencia @ continuos) / grados[:, None]
    continuos[:, 2] = np.maximum(continuos[:, 2], inicial[:, 2] * 0.8)
    continuos /= continuos.sum(1)[:, None]
    continuos **= 1.6
    continuos /= continuos.sum(1)[:, None]

    def lineal(hexadecimal):
        color = np.array([int(hexadecimal[i : i + 2], 16) / 255 for i in (0, 2, 4)])
        return np.where(
            color <= 0.04045, color / 12.92, ((color + 0.055) / 1.055) ** 2.4
        )

    paleta = np.array([lineal("b7bdc6"), lineal("125dc7"), lineal("20d6eb")])
    return np.round((continuos[inversa] @ paleta) * 65535).astype("<u2")


def exportar_glb(
    origen, posiciones, normales, uv, caras, colores, rugosidad, procedencia, ruta
):
    partes, vistas, accesores = [], [], []

    def agregar(
        datos,
        tipo,
        forma,
        cantidad,
        destino,
        normalizado=False,
        minimo=None,
        maximo=None,
        paso=None,
    ):
        vistas.append(
            {
                "buffer": 0,
                "byteOffset": sum(map(len, partes)),
                "byteLength": len(datos),
                "target": destino,
            }
        )
        if paso is not None:
            vistas[-1]["byteStride"] = paso
        partes.append(datos + b"\0" * (-len(datos) % 4))
        accesor = {
            "bufferView": len(vistas) - 1,
            "componentType": tipo,
            "count": cantidad,
            "type": forma,
        }
        if normalizado:
            accesor["normalized"] = True
        if minimo is not None:
            accesor.update(min=minimo, max=maximo)
        accesores.append(accesor)
        return len(accesores) - 1

    atributos = {}
    for nombre, valores in [
        ("POSITION", posiciones),
        ("NORMAL", normales),
        ("TEXCOORD_0", uv),
    ]:
        atributos[nombre] = agregar(
            valores.astype("<f4").tobytes(),
            5126,
            "VEC2" if nombre == "TEXCOORD_0" else "VEC3",
            len(posiciones),
            34962,
            minimo=valores.min(0).tolist(),
            maximo=valores.max(0).tolist(),
        )
    # RGB ocupa seis bytes; dos bytes de relleno mantienen cada vértice alineado a cuatro.
    colores_alineados = np.zeros((len(colores), 4), dtype="<u2")
    colores_alineados[:, :3] = colores
    atributos["COLOR_0"] = agregar(
        colores_alineados.tobytes(),
        5123,
        "VEC3",
        len(posiciones),
        34962,
        normalizado=True,
        paso=8,
    )
    indice = agregar(
        caras.astype("<u2").tobytes(),
        5123,
        "SCALAR",
        caras.size,
        34963,
        minimo=[int(caras.min())],
        maximo=[int(caras.max())],
    )
    documento = {
        clave: origen[clave] for clave in ["asset", "scene", "scenes", "nodes"]
    }
    documento["asset"] = {
        **documento["asset"],
        "generator": "IzignaMx SOS / refinamiento de superficie y materiales continuos",
    }
    documento.update(
        meshes=[
            {
                "name": "Escultura SOS / acabado metálico continuo",
                "primitives": [
                    {
                        "attributes": atributos,
                        "indices": indice,
                        "material": 0,
                        "mode": 4,
                    }
                ],
            }
        ],
        materials=[
            {
                "name": "SOS / plata, cobalto y cian",
                "pbrMetallicRoughness": {
                    "baseColorFactor": [1, 1, 1, 1],
                    "metallicFactor": 1,
                    "roughnessFactor": rugosidad,
                },
                "doubleSided": False,
            }
        ],
        accessors=accesores,
        bufferViews=vistas,
        buffers=[{"byteLength": sum(map(len, partes))}],
        extras={
            "procedencia": procedencia,
            "paletaSRGB": {"plata": "#b7bdc6", "cobalto": "#125dc7", "cian": "#20d6eb"},
        },
    )
    metadatos = json.dumps(documento, separators=(",", ":")).encode()
    metadatos += b" " * (-len(metadatos) % 4)
    cuerpo = b"".join(partes)
    salida = (
        struct.pack("<III", 0x46546C67, 2, 28 + len(metadatos) + len(cuerpo))
        + struct.pack("<II", len(metadatos), 0x4E4F534A)
        + metadatos
        + struct.pack("<II", len(cuerpo), 0x004E4942)
        + cuerpo
    )
    Path(ruta).write_bytes(salida)
    return len(salida)


def principal():
    opciones = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    opciones.add_argument(
        "entrada", help="GLB original de Higgsfield/Tripo con albedo 2048 × 2048"
    )
    opciones.add_argument("salida", help="Ruta del GLB refinado")
    opciones.add_argument(
        "--roughness",
        type=float,
        default=0.28,
        help="Rugosidad metálica entre 0 y 1 (predeterminado: 0.28)",
    )
    args = opciones.parse_args()
    if not 0 <= args.roughness <= 1:
        opciones.error("La rugosidad debe estar entre 0 y 1.")
    if Path(args.entrada).resolve() == Path(args.salida).resolve():
        opciones.error(
            "La salida debe ser distinta del original para conservar su procedencia."
        )
    documento, binario, huella = leer_glb(args.entrada)
    posiciones, normales, uv, caras, albedo = leer_origen(documento, binario)
    colores = colores_continuos(posiciones, normales, uv, caras, albedo)
    nuevas, nuevas_normales, estadisticas = suavizar_superficie(posiciones, caras)
    procedencia = {
        "proveedor": "Higgsfield / Tripo H3.1 Image to 3D",
        "generacion": "6fe7a6fb-fcff-48a2-99f6-5e4037efc37c",
        "sha256Original": huella,
        "refinamiento": "Geometría Taubin sin inversión; pigmentos COLOR_0 continuos, sin texturas raster",
        "superficie": estadisticas,
    }
    longitud = exportar_glb(
        documento,
        nuevas,
        nuevas_normales,
        uv,
        caras,
        colores,
        args.roughness,
        procedencia,
        args.salida,
    )
    print(
        json.dumps(
            {
                "salida": args.salida,
                "bytes": longitud,
                "vertices": len(nuevas),
                "triangulos": len(caras),
                "sha256Original": huella,
                **estadisticas,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    principal()
