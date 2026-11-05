// Servidor exclusivo de pruebas: HTTP local sin alterar archivos de producción.
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const raiz = path.resolve(__dirname, "..");
const tipos = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};
const perteneceAlProyecto = (archivo) => archivo.startsWith(raiz + path.sep);

http
  .createServer(async (solicitud, respuesta) => {
    if (!["GET", "HEAD"].includes(solicitud.method)) {
      respuesta.writeHead(405, { Allow: "GET, HEAD" }).end();
      return;
    }
    let ruta;
    try {
      ruta = decodeURIComponent(
        new URL(solicitud.url, "http://127.0.0.1").pathname,
      );
    } catch {
      respuesta.writeHead(400).end();
      return;
    }
    const archivo = path.resolve(
      raiz,
      "." + (ruta === "/" ? "/index.html" : ruta),
    );
    if (!perteneceAlProyecto(archivo)) {
      respuesta.writeHead(403).end();
      return;
    }
    try {
      // Resolver enlaces simbólicos impide salir del proyecto con rutas indirectas.
      const real = await fs.realpath(archivo);
      if (!perteneceAlProyecto(real)) {
        respuesta.writeHead(403).end();
        return;
      }
      let contenido = await fs.readFile(real);
      const extension = path.extname(real);
      if (extension === ".html") {
        // WebKit eleva HTTP loopback a HTTPS por esta directiva. Retirarla sólo
        // de la respuesta local permite comprobar la UI conservando el resto de CSP.
        contenido = Buffer.from(
          contenido
            .toString("utf8")
            .replace(
              /<meta\b[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
              (meta) => meta.replace(/\bupgrade-insecure-requests\b;?/g, ""),
            ),
        );
      }
      respuesta.writeHead(200, {
        "Content-Type": tipos[extension] || "application/octet-stream",
        "Content-Length": contenido.length,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      respuesta.end(solicitud.method === "HEAD" ? undefined : contenido);
    } catch (error) {
      respuesta
        .writeHead(
          ["ENOENT", "EISDIR", "ENOTDIR"].includes(error.code) ? 404 : 500,
        )
        .end();
    }
  })
  .listen(3000, "127.0.0.1");
