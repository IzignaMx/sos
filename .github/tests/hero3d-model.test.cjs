const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const archivo = fs.readFileSync(
  path.resolve(__dirname, "../../assets/models/flow-sculpture.glb"),
);
const longitudJSON = archivo.readUInt32LE(12);
const documento = JSON.parse(archivo.subarray(20, 20 + longitudJSON));
const binario = archivo.subarray(28 + longitudJSON);
const pieza = documento.meshes[0].primitives[0];

function atributo(indice) {
  const accesor = documento.accessors[indice];
  const vista = documento.bufferViews[accesor.bufferView];
  const componentes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accesor.type];
  const tipos = {
    5123: [2, "readUInt16LE", 65535],
    5125: [4, "readUInt32LE", 4294967295],
    5126: [4, "readFloatLE", 1],
  };
  const [bytes, leer, maximo] = tipos[accesor.componentType];
  const inicio = (vista.byteOffset || 0) + (accesor.byteOffset || 0);
  const paso = vista.byteStride || componentes * bytes;
  return Array.from({ length: accesor.count }, (_, fila) =>
    Array.from({ length: componentes }, (_, canal) => {
      const valor = binario[leer](inicio + fila * paso + canal * bytes);
      return accesor.normalized ? valor / maximo : valor;
    }),
  );
}

test("los antiguos parches interiores conservan pigmento azul sin manchas pintadas", () => {
  assert.notEqual(
    pieza.attributes.COLOR_0,
    undefined,
    "El acabado debe usar pigmentos uniformes, sin reutilizar el albedo manchado",
  );
  const colores = atributo(pieza.attributes.COLOR_0);
  const indices = atributo(pieza.indices).flat();
  // Anclas de las regiones defectuosas de la malla original, con topología conservada.
  for (const cara of [4837, 5582, 5890, 17914, 21377]) {
    const vertices = indices.slice(cara * 3, cara * 3 + 3);
    const color = [0, 1, 2].map((canal) =>
      vertices.reduce((suma, vertice) => suma + colores[vertice][canal] / 3, 0),
    );
    assert.ok(color[2] > color[1] * 2.5, `La cara ${cara} conserva el cobalto`);
    assert.ok(
      color[1] > color[0] * 4,
      `La cara ${cara} no conserva manchas grises`,
    );
  }
  for (const cara of [191, 525]) {
    const vertices = indices.slice(cara * 3, cara * 3 + 3);
    const rojo = vertices.reduce(
      (suma, vertice) => suma + colores[vertice][0] / 3,
      0,
    );
    const azul = vertices.reduce(
      (suma, vertice) => suma + colores[vertice][2] / 3,
      0,
    );
    assert.ok(
      rojo / azul > 0.7,
      "La cara exterior conserva su acabado plateado",
    );
  }
});

test("el acabado conserva la topología y un modelo ligero con normales válidas", () => {
  assert.equal(documento.accessors[pieza.indices].count / 3, 39696);
  assert.ok(archivo.length < 1500000, "El GLB no debe superar 1.5 MB");
  const normales = atributo(pieza.attributes.NORMAL);
  for (const normal of normales) {
    assert.ok(normal.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...normal) - 1) < 0.001);
  }
});

test("los atributos de vértice respetan la alineación de cuatro bytes de glTF", () => {
  const componentes = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
  const bytesPorComponente = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
  for (const [nombre, indice] of Object.entries(pieza.attributes)) {
    const accesor = documento.accessors[indice];
    const vista = documento.bufferViews[accesor.bufferView];
    const bytes =
      componentes[accesor.type] * bytesPorComponente[accesor.componentType];
    const inicio = (vista.byteOffset || 0) + (accesor.byteOffset || 0);
    const paso = vista.byteStride || bytes;
    assert.equal(
      inicio % 4,
      0,
      `${nombre} comienza en un límite de cuatro bytes`,
    );
    assert.equal(paso % 4, 0, `${nombre} mantiene alineado cada vértice`);
    assert.ok(paso >= bytes, `${nombre} conserva todos sus componentes`);
    assert.ok(
      (accesor.byteOffset || 0) + (accesor.count - 1) * paso + bytes <=
        vista.byteLength,
      `${nombre} no excede su bufferView`,
    );
  }
});
