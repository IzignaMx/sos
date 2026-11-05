const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { pathToFileURL } = require("node:url");
const { setTimeout: esperar } = require("node:timers/promises");

let codigo;
let temporal;
before(async () => {
  codigo = await fs.readFile(
    path.resolve(__dirname, "../../assets/js/hero3d.js"),
    "utf8",
  );
  temporal = await fs.mkdtemp(path.join(os.tmpdir(), "sos-controller-prueba-"));
  await fs.writeFile(
    path.join(temporal, "package.json"),
    '{"type":"module"}',
  );
  await fs.writeFile(
    path.join(temporal, "hero3d-renderer.js"),
    `export async function crearVisor({ superficie }) {
      superficie.intentos++;
      if (superficie.intentos === 1 || superficie.fallarSiempre)
        throw new Error("Conexión interrumpida");
      return { resize() {}, dispose() {} };
    }`,
  );
});
after(async () => {
  if (temporal) await fs.rm(temporal, { recursive: true, force: true });
});

function preparar({ fallarSiempre = false } = {}) {
  let identificador = 0;
  const fotogramas = new Map();
  const inactivos = new Map();
  const temporizadores = new Map();
  const agendar = (cola, funcion) => {
    cola.set(++identificador, funcion);
    return identificador;
  };
  const ejecutar = (cola) => {
    const pendientes = [...cola.values()];
    cola.clear();
    pendientes.forEach((funcion) => funcion());
  };
  const superficie = {
    intentos: 0,
    fallarSiempre,
    setAttribute() {},
    contains: () => false,
  };
  const pieza = {
    dataset: { model: "escultura.glb" },
    querySelector: (selector) =>
      selector === "[data-hero3d-canvas]" ? superficie : null,
    closest: () => ({ focus() {} }),
  };
  const documento = new EventTarget();
  documento.hidden = false;
  documento.currentScript = {
    src: pathToFileURL(path.join(temporal, "hero3d.js")).href,
  };
  documento.querySelector = () => pieza;
  const ventana = new EventTarget();
  ventana.requestIdleCallback = (funcion) => agendar(inactivos, funcion);
  ventana.cancelIdleCallback = (id) => inactivos.delete(id);
  new vm.Script(codigo, {
    importModuleDynamically: vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER,
  }).runInNewContext({
    document: documento,
    window: ventana,
    URL,
    AbortController,
    DOMException,
    requestAnimationFrame: (funcion) => agendar(fotogramas, funcion),
    cancelAnimationFrame: (id) => fotogramas.delete(id),
    setTimeout: (funcion) => agendar(temporizadores, funcion),
    clearTimeout: (id) => temporizadores.delete(id),
  });
  const avanzar = () => {
    while (fotogramas.size) ejecutar(fotogramas);
    ejecutar(inactivos);
  };
  const ocultar = (oculta) => {
    documento.hidden = oculta;
    documento.dispatchEvent(new Event("visibilitychange"));
  };
  const estado = async (esperado) => {
    for (let vueltas = 0; vueltas < 100; vueltas++) {
      if (pieza.dataset.state === esperado) return;
      await esperar(10);
    }
    assert.equal(pieza.dataset.state, esperado);
  };
  return {
    superficie,
    pieza,
    inactivos,
    avanzar,
    ocultar,
    estado,
    conectar: () => ventana.dispatchEvent(new Event("online")),
  };
}

async function fallarPrimeraCarga(opciones) {
  const prueba = preparar(opciones);
  prueba.avanzar();
  await prueba.estado("error");
  assert.equal(prueba.superficie.intentos, 1);
  return prueba;
}

test("recupera la carga si vuelve la conexión mientras la pestaña está oculta", async () => {
  const prueba = await fallarPrimeraCarga();
  prueba.ocultar(true);
  prueba.conectar();
  assert.equal(prueba.inactivos.size, 0);
  assert.equal(prueba.superficie.intentos, 1);
  prueba.ocultar(false);
  prueba.avanzar();
  await prueba.estado("ready");
  assert.equal(prueba.superficie.intentos, 2);
});

test("conserva el reintento si la pestaña se oculta antes del momento de inactividad", async () => {
  const prueba = await fallarPrimeraCarga();
  prueba.conectar();
  assert.equal(prueba.inactivos.size, 1);
  prueba.ocultar(true);
  assert.equal(prueba.inactivos.size, 0);
  prueba.ocultar(false);
  prueba.avanzar();
  await prueba.estado("ready");
  assert.equal(prueba.superficie.intentos, 2);
});

test("los eventos de conexión no superan las dos cargas permitidas", async () => {
  const prueba = await fallarPrimeraCarga({ fallarSiempre: true });
  prueba.conectar();
  prueba.avanzar();
  await prueba.estado("error");
  assert.equal(prueba.superficie.intentos, 2);
  for (let vuelta = 0; vuelta < 3; vuelta++) {
    prueba.ocultar(true);
    prueba.conectar();
    prueba.ocultar(false);
    prueba.conectar();
    prueba.avanzar();
  }
  await esperar(20);
  assert.equal(prueba.superficie.intentos, 2);
  assert.equal(prueba.pieza.dataset.state, "error");
});

test("volver a la pestaña sin recuperar conexión no consume el reintento", async () => {
  const prueba = await fallarPrimeraCarga();
  prueba.ocultar(true);
  prueba.ocultar(false);
  prueba.avanzar();
  await esperar(20);
  assert.equal(prueba.superficie.intentos, 1);
  assert.equal(prueba.pieza.dataset.state, "error");
});
