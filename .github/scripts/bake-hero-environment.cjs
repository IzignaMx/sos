// Hornear una vez el estudio HDR; el navegador público sólo lee el atlas filtrado.
// Uso: node .github/scripts/bake-hero-environment.cjs [128|256] [archivo.bin.gz]
const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { gzipSync } = require("node:zlib");
const { build } = require("esbuild");
const { chromium } = require("playwright");

async function generar() {
  const raiz = path.resolve(__dirname, "../..");
  const lado = Number(process.argv[2] || 256);
  if (![128, 256].includes(lado))
    throw new Error("Usa un lado de 128 o 256 píxeles");
  const destino = path.resolve(
    process.argv[3] ||
      path.join(raiz, "assets/models/studio-environment.bin.gz"),
  );
  const modulo = await build({
    stdin: {
      contents: `
import { WebGLRenderer, PMREMGenerator } from "three";
import { crearEstudio } from "./.github/scripts/hero-studio.js";
window.hornear = (lado) => {
  const motor = new WebGLRenderer({ antialias: false });
  const estudio = crearEstudio();
  const generador = new PMREMGenerator(motor);
  const entorno = generador.fromScene(estudio, 0.04, 0.1, 100, { size: lado });
  const datos = new Uint16Array(entorno.width * entorno.height * 4);
  motor.readRenderTargetPixels(entorno, 0, 0, entorno.width, entorno.height, datos);
  const muestrasHDR = datos.reduce((suma, valor, indice) => suma + (indice % 4 !== 3 && valor > 0x3c00 ? 1 : 0), 0);
  if (!muestrasHDR) throw new Error("El renderizado no produjo datos HDR");
  const cabecera = new ArrayBuffer(16);
  const vista = new DataView(cabecera);
  vista.setUint32(0, 0x31534f53, true);
  vista.setUint32(4, entorno.width, true);
  vista.setUint32(8, entorno.height, true);
  vista.setUint32(12, 4, true);
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([cabecera, datos], { type: "application/octet-stream" }));
  enlace.download = "estudio.bin";
  enlace.click();
  const resultado = { ancho: entorno.width, alto: entorno.height, muestrasHDR };
  entorno.dispose();
  generador.dispose();
  estudio.dispose();
  motor.dispose();
  return resultado;
};`,
      resolveDir: raiz,
      sourcefile: "hornear-estudio.js",
    },
    bundle: true,
    format: "esm",
    write: false,
    logLevel: "silent",
  });
  const servidor = http.createServer((solicitud, respuesta) => {
    if (solicitud.url === "/hornear.js") {
      respuesta.writeHead(200, { "Content-Type": "text/javascript" });
      respuesta.end(modulo.outputFiles[0].contents);
    } else {
      respuesta.writeHead(200, { "Content-Type": "text/html" });
      respuesta.end(
        '<!doctype html><html lang="es"><title>Hornear iluminación SOS</title><script type="module" src="/hornear.js"></script></html>',
      );
    }
  });
  await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const temporal = await fs.mkdtemp(path.join(os.tmpdir(), "sos-estudio-"));
  let navegador;
  try {
    navegador = await chromium.launch({ headless: true });
    const pagina = await navegador.newPage({ acceptDownloads: true });
    await pagina.goto(`http://127.0.0.1:${servidor.address().port}/`);
    const [descarga, resultado] = await Promise.all([
      pagina.waitForEvent("download", { timeout: 120000 }),
      pagina.evaluate((medida) => window.hornear(medida), lado),
    ]);
    const archivo = path.join(temporal, "estudio.bin");
    await descarga.saveAs(archivo);
    const datos = await fs.readFile(archivo);
    const comprimido = gzipSync(datos, { level: 9 });
    await fs.mkdir(path.dirname(destino), { recursive: true });
    await fs.writeFile(destino, comprimido);
    console.log(
      JSON.stringify({
        ...resultado,
        bytes: datos.length,
        gzip: comprimido.length,
        destino,
      }),
    );
  } finally {
    await navegador?.close();
    await new Promise((resolve) => servidor.close(resolve));
    await fs.rm(temporal, { recursive: true, force: true });
  }
}

generar().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
