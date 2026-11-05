const { before, after, beforeEach, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { build } = require("esbuild");

let crearMotor;
let temporal;
let lienzos;
let procesos;
before(async () => {
  temporal = await fs.mkdtemp(path.join(os.tmpdir(), "sos-motor-prueba-"));
  const archivo = path.join(temporal, "motor.mjs");
  await build({
    entryPoints: [path.resolve(__dirname, "../../src/hero3d-backend.js")],
    outfile: archivo,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    logLevel: "silent",
  });
  ({ crearMotor } = await import(pathToFileURL(archivo).href));
});
after(async () => {
  if (temporal) await fs.rm(temporal, { recursive: true, force: true });
});
beforeEach(() => {
  lienzos = [];
  procesos = [];
});

function preparar(t) {
  const sustituir = (nombre, valor) => {
    const anterior = Object.getOwnPropertyDescriptor(globalThis, nombre);
    Object.defineProperty(globalThis, nombre, {
      value: valor,
      configurable: true,
      writable: true,
    });
    t.after(() => {
      if (anterior) Object.defineProperty(globalThis, nombre, anterior);
      else delete globalThis[nombre];
    });
  };
  class Lienzo extends EventTarget {
    retirado = false;
    setAttribute() {}
    transferControlToOffscreen() {
      return { fueraDePantalla: true };
    }
    remove() {
      this.retirado = true;
    }
  }
  class Proceso extends EventTarget {
    mensajes = [];
    terminado = false;
    constructor(url, opciones) {
      super();
      this.url = String(url);
      this.opciones = opciones;
      procesos.push(this);
    }
    postMessage(mensaje) {
      this.mensajes.push(mensaje);
    }
    terminate() {
      this.terminado = true;
    }
    responder(datos) {
      this.dispatchEvent(new MessageEvent("message", { data: datos }));
    }
  }
  sustituir("Worker", Proceso);
  sustituir("OffscreenCanvas", class {});
  sustituir("HTMLCanvasElement", Lienzo);
  sustituir("document", {
    baseURI: "https://sos.example/",
    createElement() {
      const lienzo = new Lienzo();
      lienzos.push(lienzo);
      return lienzo;
    },
  });
  return { dataset: {}, append() {} };
}

const estado = (giro) => ({
  giro: [0, giro, 0],
  ambiente: [0, 0, 0],
  posicion: [0, 0, 0],
});
const opciones = (superficie, signal, alPerderContexto = () => {}) => ({
  superficie,
  signal,
  alPerderContexto,
  url: "assets/models/escultura.glb?v=prueba",
  ancho: 400,
  alto: 400,
  pixelRatio: 1,
  orientacion: [0, 0, 0],
});

test("envía como máximo un fotograma pendiente y conserva la última pose", async (t) => {
  const superficie = preparar(t);
  const pendiente = crearMotor(
    opciones(superficie, new AbortController().signal),
  );
  const proceso = procesos[0];
  assert.equal(proceso.mensajes[0].tipo, "init");
  assert.equal(
    proceso.mensajes[0].url,
    "https://sos.example/assets/models/escultura.glb?v=prueba",
  );
  proceso.responder({ tipo: "ready" });
  const motor = await pendiente;
  assert.equal(superficie.dataset.renderer, "worker");
  motor.pintar(estado(1));
  motor.pintar(estado(2));
  motor.pintar(estado(3));
  assert.equal(proceso.mensajes.filter((m) => m.tipo === "draw").length, 1);
  proceso.responder({ tipo: "drawn" });
  const dibujos = proceso.mensajes.filter((m) => m.tipo === "draw");
  assert.equal(dibujos.length, 2);
  assert.equal(dibujos[1].estado.giro[1], 3);
  motor.dispose();
  assert.equal(proceso.terminado, true);
  assert.equal(lienzos[0].retirado, true);
});

test("cancelar durante la preparación termina el worker y retira el canvas", async (t) => {
  const superficie = preparar(t);
  const cancelacion = new AbortController();
  const pendiente = crearMotor(opciones(superficie, cancelacion.signal));
  cancelacion.abort();
  await assert.rejects(pendiente, { name: "AbortError" });
  assert.equal(procesos[0].terminado, true);
  assert.equal(lienzos[0].retirado, true);
  procesos[0].responder({ tipo: "ready" });
  assert.equal(lienzos.length, 1);
});

test("un cambio de tamaño pendiente conserva la última pose sin llenar la cola", async (t) => {
  const superficie = preparar(t);
  const pendiente = crearMotor(
    opciones(superficie, new AbortController().signal),
  );
  const proceso = procesos[0];
  proceso.responder({ tipo: "ready" });
  const motor = await pendiente;
  motor.pintar(estado(1));
  motor.redimensionar(500, 420);
  motor.pintar(estado(2));
  motor.redimensionar(620, 480);
  assert.equal(proceso.mensajes.length, 2);
  proceso.responder({ tipo: "drawn" });
  const siguiente = proceso.mensajes.at(-1);
  assert.equal(siguiente.tipo, "resize");
  assert.deepEqual(siguiente.medida, [620, 480]);
  assert.equal(siguiente.estado.giro[1], 2);
  proceso.responder({ tipo: "drawn" });
  assert.equal(proceso.mensajes.length, 3);
  motor.dispose();
});

test("un fallo del recurso no intenta ocultarse con otro renderizador", async (t) => {
  const superficie = preparar(t);
  const pendiente = crearMotor(
    opciones(superficie, new AbortController().signal),
  );
  procesos[0].responder({
    tipo: "error",
    codigo: "ASSET",
    mensaje: "No se pudo cargar la escultura",
  });
  await assert.rejects(pendiente, { codigo: "ASSET" });
  assert.equal(lienzos.length, 1);
  assert.equal(procesos[0].terminado, true);
});

test("la pérdida de contexto devuelve el control al respaldo y no deja mensajes vivos", async (t) => {
  const superficie = preparar(t);
  let fallos = 0;
  const pendiente = crearMotor(
    opciones(superficie, new AbortController().signal, () => fallos++),
  );
  procesos[0].responder({ tipo: "ready" });
  const motor = await pendiente;
  lienzos[0].dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  assert.equal(fallos, 1);
  assert.equal(procesos[0].terminado, true);
  procesos[0].responder({ tipo: "contextlost" });
  motor.pintar(estado(1));
  assert.equal(fallos, 1);
  assert.equal(procesos[0].mensajes.filter((m) => m.tipo === "draw").length, 0);
});
