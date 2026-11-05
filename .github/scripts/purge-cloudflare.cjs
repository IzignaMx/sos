/* Purga del CDN tras una publicación confirmada; nunca imprime credenciales. */
const fs = require("node:fs");
const HOST = "sos.izignamx.com";
const RUTA_PAGES = "dynamic/pages/pages-build-deployment";

// HTML permite valores de atributo sin comillas; un CDN puede minificarlos.
const leerVersion = (html) => {
  const coincidencia = html.match(
    /\bdata-release\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s"'=<>`]+))/i,
  );
  return coincidencia?.[1] ?? coincidencia?.[2] ?? coincidencia?.[3];
};
const datoPublico = (valor) =>
  String(valor || "desconocido")
    .replace(/[^a-z0-9_.+/-]/gi, "")
    .slice(0, 100);

async function ejecutar({
  entorno = process.env,
  evento = {},
  solicitar = fetch,
  esperar = (ms) => new Promise((resolver) => setTimeout(resolver, ms)),
  registrar = console.log,
} = {}) {
  const token = entorno.CLOUDFLARE_API_TOKEN?.trim();
  const zona = entorno.CLOUDFLARE_ZONE_ID?.trim();
  if (!token)
    throw new Error(
      "Configura el secret CLOUDFLARE_API_TOKEN en GitHub Actions.",
    );
  if (!zona)
    throw new Error(
      "Configura la variable CLOUDFLARE_ZONE_ID en GitHub Actions.",
    );
  if (!/^[a-f0-9]{32}$/i.test(zona))
    throw new Error(
      "CLOUDFLARE_ZONE_ID debe ser el ID de zona de 32 caracteres hexadecimales.",
    );
  if (!entorno.GITHUB_TOKEN)
    throw new Error("Falta GITHUB_TOKEN para comprobar GitHub Pages.");
  const repositorio = entorno.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repositorio || ""))
    throw new Error("GITHUB_REPOSITORY no es válido.");
  const automatico = entorno.GITHUB_EVENT_NAME === "workflow_run";
  if (!automatico && entorno.GITHUB_EVENT_NAME !== "workflow_dispatch")
    throw new Error(
      "Sólo se admite ejecución manual o posterior a GitHub Pages.",
    );

  const consultarGitHub = async (ruta) => {
    let respuesta;
    try {
      respuesta = await solicitar(
        "https://api.github.com/repos/" + repositorio + ruta,
        {
          headers: {
            Authorization: "Bearer " + entorno.GITHUB_TOKEN,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "sos-cache-workflow",
          },
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch {
      throw new Error("No se pudo consultar GitHub Pages.");
    }
    if (!respuesta.ok)
      throw new Error(
        "GitHub respondió HTTP " + respuesta.status + " al comprobar Pages.",
      );
    try {
      return await respuesta.json();
    } catch {
      throw new Error("GitHub devolvió una respuesta JSON inválida.");
    }
  };

  const referencia = await consultarGitHub("/git/ref/heads/gh-pages");
  const sha = referencia.object?.sha;
  if (!/^[a-f0-9]{40}$/i.test(sha || ""))
    throw new Error("No se pudo identificar el commit actual de gh-pages.");
  let publicacion;
  if (automatico) {
    const origen = evento.workflow_run;
    if (
      origen?.head_repository?.full_name !== repositorio ||
      origen?.head_branch !== "gh-pages"
    ) {
      throw new Error(
        "El evento no corresponde a gh-pages de este repositorio.",
      );
    }
    if (origen.head_sha !== sha) {
      registrar(
        "Se omite un despliegue reemplazado por otro commit de gh-pages.",
      );
      return { omitido: true };
    }
    if (!Number.isSafeInteger(origen.id) || origen.id <= 0)
      throw new Error("El identificador de publicación no es válido.");
    publicacion = await consultarGitHub("/actions/runs/" + origen.id);
  } else {
    const ejecuciones = await consultarGitHub(
      "/actions/runs?branch=gh-pages&per_page=50",
    );
    // No saltar una ejecución reciente pendiente para elegir un éxito anterior.
    publicacion = ejecuciones.workflow_runs?.find(
      (run) => run.path === RUTA_PAGES && run.head_sha === sha,
    );
  }
  if (
    publicacion?.path !== RUTA_PAGES ||
    publicacion?.head_repository?.full_name !== repositorio ||
    publicacion?.head_branch !== "gh-pages" ||
    publicacion?.head_sha !== sha ||
    publicacion?.status !== "completed" ||
    publicacion?.conclusion !== "success"
  ) {
    throw new Error(
      "El commit actual de gh-pages todavía no tiene una publicación de Pages completada con éxito.",
    );
  }
  const archivo = await consultarGitHub("/contents/index.html?ref=" + sha);
  if (archivo.encoding !== "base64" || typeof archivo.content !== "string")
    throw new Error("No se pudo leer index.html del commit publicado.");
  const html = Buffer.from(archivo.content, "base64").toString("utf8");
  const version = leerVersion(html);
  if (!/^[a-z0-9][a-z0-9._-]{0,100}$/i.test(version || ""))
    throw new Error("El HTML publicado no contiene un data-release válido.");

  for (let intento = 1; intento <= 3; intento++) {
    let respuesta;
    try {
      respuesta = await solicitar(
        "https://api.cloudflare.com/client/v4/zones/" + zona + "/purge_cache",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hosts: [HOST] }),
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
    } catch {
      if (intento === 3)
        throw new Error("No se pudo conectar a Cloudflare tras tres intentos.");
      registrar("Conexión temporalmente fallida; se reintentará la purga.");
      await esperar(15000 * intento);
      continue;
    }
    if ((respuesta.status === 429 || respuesta.status >= 500) && intento < 3) {
      registrar(
        "Cloudflare respondió HTTP " +
          respuesta.status +
          "; se reintentará la purga.",
      );
      await esperar(15000 * intento);
      continue;
    }
    if (!respuesta.ok)
      throw new Error(
        "Cloudflare rechazó la purga (HTTP " +
          respuesta.status +
          "). Revisa permisos de Cache Purge, zona y límites.",
      );
    let resultado;
    try {
      resultado = await respuesta.json();
    } catch {
      throw new Error("Cloudflare devolvió una respuesta JSON inválida.");
    }
    if (resultado?.success !== true)
      throw new Error(
        "Cloudflare no confirmó la purga: success no es true. Revisa el token y la zona.",
      );
    registrar(
      "Cloudflare aceptó la purga de " + HOST + ". Comprobando la portada.",
    );
    break;
  }

  let ultimoEstado = "sin respuesta";
  for (let intento = 1; intento <= 6; intento++) {
    try {
      // No enviar credenciales de ninguna API al sitio público.
      const respuesta = await solicitar("https://" + HOST + "/", {
        headers: {
          "Cache-Control": "no-cache",
          Accept: "text/html",
          "User-Agent": "IzignaMx-SOS-Deployment-Check/1.0",
        },
        signal: AbortSignal.timeout(15000),
      });
      ultimoEstado =
        "HTTP " +
        respuesta.status +
        ", tipo " +
        datoPublico(respuesta.headers.get("content-type")?.split(";")[0]);
      if (respuesta.ok) {
        const actual = leerVersion(await respuesta.text());
        ultimoEstado += ", versión " + datoPublico(actual);
        if (actual === version) {
          registrar("Portada verificada: " + version + ".");
          return { omitido: false, host: HOST, version };
        }
      }
    } catch (error) {
      // Sólo el código: los mensajes de terceros pueden incluir datos sensibles.
      ultimoEstado =
        "Error de conexión " + datoPublico(error.cause?.code || error.name);
    }
    if (intento < 6) await esperar(4000);
  }
  throw new Error(
    "Cloudflare aceptó la purga, pero no se pudo verificar la versión " +
      version +
      ". Última consulta: " +
      ultimoEstado +
      ". Revisa Pages o el acceso HTTP y vuelve a ejecutar la acción.",
  );
}

module.exports = { ejecutar };

if (require.main === module) {
  const resumen = (texto) => {
    if (process.env.GITHUB_STEP_SUMMARY)
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, texto + "\n");
  };
  (async () => {
    const evento = process.env.GITHUB_EVENT_PATH
      ? JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
      : {};
    const resultado = await ejecutar({ evento });
    resumen(
      resultado.omitido
        ? "Se omitió un despliegue reemplazado. No se envió una purga."
        : "Purga aceptada para **" +
            resultado.host +
            "**. Portada verificada: `" +
            resultado.version +
            "`.",
    );
  })().catch((error) => {
    console.error(error.message);
    resumen("No se completó la purga/verificación. " + error.message);
    process.exitCode = 1;
  });
}
