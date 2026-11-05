/* Escena compartida: WebGL puede vivir en un Worker o en el respaldo del navegador. */
import {
  ACESFilmicToneMapping,
  Box3,
  DirectionalLight,
  Group,
  HemisphereLight,
  LoadingManager,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { cargarEntorno } from "./hero3d-environment.js";

const cancelado = () => new DOMException("Carga cancelada", "AbortError");

export async function crearEscena({
  canvas,
  url,
  signal,
  ancho,
  alto,
  pixelRatio = 1,
  orientacion = [0, 0, 0],
  alPerderContexto,
}) {
  signal?.throwIfAborted();
  let motor;
  try {
    const opciones = {
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    };
    const contexto = canvas.getContext("webgl2", opciones);
    if (!contexto) throw new Error("WebGL no está disponible");
    motor = new WebGLRenderer({ ...opciones, canvas, context: contexto });
  } catch (causa) {
    const error = new Error("Este contexto no admite WebGL", { cause: causa });
    error.codigo = "UNSUPPORTED";
    throw error;
  }
  motor.setClearColor(0x000000, 0);
  const densidadMaxima = Math.max(1, Math.min(pixelRatio, 2));
  motor.toneMapping = ACESFilmicToneMapping;
  motor.toneMappingExposure = 1.2;
  const escena = new Scene();
  const camara = new PerspectiveCamera(34, 1, 0.01, 100);
  const ambiente = new Group();
  const giro = new Group();
  ambiente.add(giro);
  escena.add(ambiente);
  escena.environmentIntensity = 1.35;
  escena.add(new HemisphereLight(0xffffff, 0x183448, 1.2));
  const luz = new DirectionalLight(0xffffff, 2.3);
  luz.position.set(-2, 4, 5);
  escena.add(luz);
  const relleno = new DirectionalLight(0xb8dcff, 1.4);
  relleno.position.set(3, 1, -2);
  escena.add(relleno);

  let entorno;
  let modelo;
  let compilacion;
  let destruido = false;
  let liberado = false;
  const eventos = new AbortController();
  const esperar = (promesa) =>
    new Promise((resolver, rechazar) => {
      const abortar = () => rechazar(cancelado());
      if (signal?.aborted) abortar();
      else signal?.addEventListener("abort", abortar, { once: true });
      Promise.resolve(promesa)
        .then(resolver, rechazar)
        .finally(() => signal?.removeEventListener("abort", abortar));
    });
  const liberarModelo = (raiz = modelo) => {
    const materiales = new Set();
    const texturas = new Set();
    raiz?.traverse((objeto) => {
      objeto.geometry?.dispose();
      const lista = Array.isArray(objeto.material)
        ? objeto.material
        : [objeto.material];
      lista.filter(Boolean).forEach((material) => materiales.add(material));
    });
    materiales.forEach((material) => {
      Object.values(material).forEach((valor) => {
        if (valor?.isTexture) texturas.add(valor);
      });
      material.dispose();
    });
    texturas.forEach((textura) => {
      textura.source?.data?.close?.();
      textura.dispose();
    });
  };
  const liberarGPU = () => {
    if (liberado) return;
    liberado = true;
    liberarModelo();
    entorno?.dispose();
    motor.dispose();
  };
  const dispose = () => {
    if (destruido) return;
    destruido = true;
    eventos.abort();
    signal?.removeEventListener("abort", dispose);
    // compileAsync consulta sus programas hasta resolverse: liberar después.
    if (compilacion) compilacion.then(liberarGPU, liberarGPU);
    else liberarGPU();
  };
  signal?.addEventListener("abort", dispose, { once: true });
  canvas.addEventListener(
    "webglcontextlost",
    (evento) => {
      evento.preventDefault();
      alPerderContexto?.();
    },
    { signal: eventos.signal },
  );

  const redimensionar = (nuevoAncho, nuevoAlto) => {
    if (destruido) return;
    const w = Math.max(1, nuevoAncho);
    const h = Math.max(1, nuevoAlto);
    // Nitidez hasta 2× sin multiplicar sin límite el coste de un marco grande.
    const densidad = Math.min(densidadMaxima, Math.sqrt(1600000 / (w * h)));
    if (motor.getPixelRatio() !== densidad) motor.setPixelRatio(densidad);
    motor.setSize(w, h, false);
    camara.aspect = w / h;
    camara.position.set(0, 0, 4.3 / Math.min(1, camara.aspect));
    camara.lookAt(0, 0, 0);
    camara.updateProjectionMatrix();
  };
  const pintar = (estado) => {
    if (destruido) return;
    giro.rotation.set(...estado.giro, "YXZ");
    ambiente.rotation.set(...estado.ambiente, "YXZ");
    ambiente.position.set(...estado.posicion);
    motor.render(escena, camara);
  };

  try {
    const iluminacion = cargarEntorno({ signal }).then((textura) => {
      if (destruido || signal?.aborted) {
        textura.dispose();
        throw cancelado();
      }
      entorno = textura;
    });
    const [respuesta] = await esperar(
      Promise.all([
        fetch(url, { signal, credentials: "same-origin" }),
        iluminacion,
      ]),
    );
    if (!respuesta.ok) throw new Error("No se pudo cargar la escultura");
    escena.environment = entorno;
    const contenido = await respuesta.arrayBuffer();
    let texturaFallida = false;
    const recursos = new LoadingManager();
    recursos.onError = () => {
      texturaFallida = true;
    };
    await esperar(
      new GLTFLoader(recursos)
        .parseAsync(contenido, new URL(".", url).href)
        .then((gltf) => {
          if (destruido || signal?.aborted) {
            liberarModelo(gltf.scene);
            throw cancelado();
          }
          modelo = gltf.scene;
        }),
    );
    if (texturaFallida) throw new Error("No se pudieron cargar los materiales");
    signal?.throwIfAborted();
    const anisotropia = Math.min(8, motor.capabilities.getMaxAnisotropy());
    const texturas = new Set();
    modelo.traverse((objeto) => {
      const materiales = Array.isArray(objeto.material)
        ? objeto.material
        : [objeto.material];
      materiales.filter(Boolean).forEach((material) => {
        Object.values(material).forEach((valor) => {
          if (valor?.isTexture) texturas.add(valor);
        });
      });
    });
    texturas.forEach((textura) => {
      textura.anisotropy = anisotropia;
    });
    const limites = new Box3().setFromObject(modelo);
    const dimensiones = limites.getSize(new Vector3());
    const centro = limites.getCenter(new Vector3());
    const escala = 2 / Math.max(dimensiones.x, dimensiones.y, dimensiones.z);
    if (!Number.isFinite(escala)) throw new Error("Geometría vacía");
    modelo.scale.multiplyScalar(escala);
    modelo.position.sub(centro.multiplyScalar(escala));
    giro.add(modelo);
    giro.rotation.set(...orientacion, "YXZ");
    redimensionar(ancho, alto);
    compilacion = motor.compileAsync(escena, camara);
    await esperar(compilacion);
    compilacion = null;
    signal?.throwIfAborted();
    pintar({ giro: orientacion, ambiente: [0, 0, 0], posicion: [0, 0, 0] });
    return { pintar, redimensionar, dispose };
  } catch (error) {
    dispose();
    if (error.name !== "AbortError") error.codigo ||= "ASSET";
    throw error;
  }
}
