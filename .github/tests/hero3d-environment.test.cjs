const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { gzipSync, gunzipSync } = require("node:zlib");
const { build } = require("esbuild");

let cargarEntorno;
let temporal;
before(async () => {
  temporal = await fs.mkdtemp(path.join(os.tmpdir(), "sos-entorno-prueba-"));
  const archivo = path.join(temporal, "entorno.mjs");
  await build({
    entryPoints: [path.resolve(__dirname, "../../src/hero3d-environment.js")],
    outfile: archivo,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node22",
    logLevel: "silent",
  });
  ({ cargarEntorno } = await import(pathToFileURL(archivo).href));
});
after(async () => {
  if (temporal) await fs.rm(temporal, { recursive: true, force: true });
});

function atlas() {
  const ancho = 384;
  const alto = 512;
  const datos = Buffer.alloc(16 + ancho * alto * 8);
  datos.write("SOS1", 0);
  datos.writeUInt32LE(ancho, 4);
  datos.writeUInt32LE(alto, 8);
  datos.writeUInt32LE(4, 12);
  datos.writeUInt16LE(0x3800, 16); // 0.5 en coma flotante de 16 bits.
  datos.writeUInt16LE(0x4000, 18); // 2.0: conserva luz HDR por encima de uno.
  return datos;
}

test("el estudio publicado conserva reflejos HDR a resolución de cara 256", async () => {
  const archivo = await fs.readFile(
    path.resolve(__dirname, "../../assets/models/studio-environment.bin.gz"),
  );
  const datos = gunzipSync(archivo);
  assert.equal(datos.subarray(0, 4).toString(), "SOS1");
  assert.equal(datos.readUInt32LE(4), 768);
  assert.equal(datos.readUInt32LE(8), 1024);
  assert.equal(datos.length, 16 + 768 * 1024 * 8);
  let hdr = false;
  for (let posicion = 16; posicion < datos.length; posicion += 8) {
    if (datos.readUInt16LE(posicion) > 0x3c00) {
      hdr = true;
      break;
    }
  }
  assert.ok(hdr, "El estudio conserva valores de luz superiores a uno");
});

test("carga el atlas comprimido conservando valores HDR y la señal de cancelación", async (t) => {
  const cancelacion = new AbortController();
  const peticiones = [];
  t.mock.method(globalThis, "fetch", async (url, opciones) => {
    peticiones.push({ url, opciones });
    return new Response(gzipSync(atlas()));
  });
  const textura = await cargarEntorno({
    url: "https://ejemplo.invalid/estudio.gz?v=prueba",
    signal: cancelacion.signal,
  });
  assert.equal(peticiones.length, 1);
  assert.equal(peticiones[0].opciones.signal, cancelacion.signal);
  assert.equal(textura.image.width, 384);
  assert.equal(textura.image.height, 512);
  assert.equal(textura.image.data[0], 0x3800);
  assert.equal(textura.image.data[1], 0x4000);
  assert.equal(textura.mapping, 306); // CubeUVReflectionMapping.
  assert.equal(textura.type, 1016); // HalfFloatType.
  assert.equal(textura.colorSpace, "srgb-linear");
  assert.equal(textura.generateMipmaps, false);
  assert.equal(textura.flipY, false);
  textura.dispose();
});

test("acepta la respuesta que el CDN ya descomprimió", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response(atlas()));
  const textura = await cargarEntorno({
    url: "https://ejemplo.invalid/estudio.gz",
  });
  assert.equal(textura.image.data.length, 384 * 512 * 4);
  assert.equal(textura.image.data[1], 0x4000);
  textura.dispose();
});

test("rechaza respuestas HTTP fallidas y atlas truncados sin crear una textura incompleta", async (t) => {
  const respuestas = [
    new Response("No encontrado", { status: 404 }),
    new Response(atlas().subarray(0, 128)),
    new Response("<!doctype html>Recurso no disponible"),
  ];
  t.mock.method(globalThis, "fetch", async () => respuestas.shift());
  for (let i = 0; i < 3; i++) {
    await assert.rejects(
      cargarEntorno({ url: "https://ejemplo.invalid/estudio.gz" }),
    );
  }
});

test("rechaza una carga cancelada aunque ya haya recibido el archivo", async (t) => {
  const cancelacion = new AbortController();
  t.mock.method(globalThis, "fetch", async () => {
    cancelacion.abort();
    return new Response(gzipSync(atlas()));
  });
  await assert.rejects(
    cargarEntorno({
      url: "https://ejemplo.invalid/estudio.gz",
      signal: cancelacion.signal,
    }),
    { name: "AbortError" },
  );
});
