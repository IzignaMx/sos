const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ejecutar } = require("../scripts/purge-cloudflare.cjs");

const repositorio = "IzignaMx/sos";
const zona = "a".repeat(32);
const sha = "b".repeat(40);
const version = "20261105-prueba";
const html = `<html lang="es-MX" data-release="${version}"><body>SOS</body></html>`;
const entornoBase = {
  CLOUDFLARE_API_TOKEN: "cf-token-ficticio-solo-pruebas",
  CLOUDFLARE_ZONE_ID: zona,
  GITHUB_TOKEN: "gh-token-ficticio-solo-pruebas",
  GITHUB_REPOSITORY: repositorio,
  GITHUB_EVENT_NAME: "workflow_dispatch",
};
const ejecucionPages = {
  id: 7,
  path: "dynamic/pages/pages-build-deployment",
  name: "pages build and deployment",
  head_branch: "gh-pages",
  head_sha: sha,
  status: "completed",
  conclusion: "success",
  head_repository: { full_name: repositorio },
};
const json = (datos, estado = 200) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { "content-type": "application/json" },
  });

function preparar(opciones = {}) {
  const peticiones = [];
  const esperas = [];
  const mensajes = [];
  let intentosCloudflare = 0;
  let intentosPublicos = 0;
  const run = { ...ejecucionPages, ...opciones.run };
  const solicitar = async (destino, configuracion = {}) => {
    const url = new URL(destino);
    const peticion = {
      url,
      metodo: configuracion.method || "GET",
      cabeceras: new Headers(configuracion.headers),
      cuerpo: configuracion.body,
    };
    peticiones.push(peticion);
    if (url.origin === "https://api.github.com") {
      assert.equal(peticion.metodo, "GET");
      const rutaBase = `/repos/${repositorio}`;
      if (url.pathname === `${rutaBase}/git/ref/heads/gh-pages`)
        return json({ object: { sha: opciones.shaActual || sha } });
      if (url.pathname === `${rutaBase}/actions/runs`)
        return json({ workflow_runs: opciones.runs || [run] });
      if (url.pathname === `${rutaBase}/actions/runs/7`) return json(run);
      if (url.pathname === `${rutaBase}/contents/index.html`) {
        assert.equal(url.searchParams.get("ref"), opciones.shaActual || sha);
        return json({
          encoding: "base64",
          content: Buffer.from(html).toString("base64"),
        });
      }
    }
    if (url.origin === "https://api.cloudflare.com") {
      intentosCloudflare += 1;
      return opciones.cloudflare
        ? opciones.cloudflare(intentosCloudflare, peticion)
        : json({ success: true, errors: [], result: { id: "purga-simulada" } });
    }
    if (url.origin === "https://sos.izignamx.com") {
      intentosPublicos += 1;
      assert.equal(peticion.metodo, "GET");
      assert.equal(url.pathname, "/");
      assert.equal(url.search, "");
      return opciones.publico
        ? opciones.publico(intentosPublicos, peticion)
        : new Response(html);
    }
    throw new Error(`Petición inesperada en prueba: ${url}`);
  };
  return {
    peticiones,
    esperas,
    mensajes,
    ejecutar: (adicional = {}) =>
      ejecutar({
        entorno: { ...entornoBase, ...adicional.entorno },
        evento: adicional.evento || {},
        solicitar,
        esperar: async (milisegundos) => esperas.push(milisegundos),
        registrar: (...partes) => mensajes.push(partes.join(" ")),
      }),
  };
}
const aCloudflare = (escenario) =>
  escenario.peticiones.filter(
    (p) => p.url.origin === "https://api.cloudflare.com",
  );
const alSitio = (escenario) =>
  escenario.peticiones.filter(
    (p) => p.url.origin === "https://sos.izignamx.com",
  );

// Las respuestas se simulan: ninguna prueba usa credenciales reales ni hace red.
test("purga únicamente SOS después de Pages y verifica la versión sin enviar credenciales al sitio", async () => {
  const escenario = preparar();
  const resultado = await escenario.ejecutar();
  assert.deepEqual(resultado, {
    omitido: false,
    host: "sos.izignamx.com",
    version,
  });
  assert.equal(aCloudflare(escenario).length, 1);
  const peticion = aCloudflare(escenario)[0];
  assert.equal(
    peticion.url.href,
    `https://api.cloudflare.com/client/v4/zones/${zona}/purge_cache`,
  );
  assert.equal(peticion.metodo, "POST");
  assert.deepEqual(JSON.parse(peticion.cuerpo), {
    hosts: ["sos.izignamx.com"],
  });
  assert.equal(
    peticion.cabeceras.get("authorization"),
    `Bearer ${entornoBase.CLOUDFLARE_API_TOKEN}`,
  );
  assert.ok(alSitio(escenario).length > 0);
  for (const publica of alSitio(escenario))
    assert.equal(publica.cabeceras.get("authorization"), null);
  assert.ok(
    !escenario.mensajes.join("\n").includes(entornoBase.CLOUDFLARE_API_TOKEN),
  );
  assert.ok(!escenario.mensajes.join("\n").includes(entornoBase.GITHUB_TOKEN));
});

test("una ejecución automática vuelve a confirmar el run exitoso antes de purgar", async () => {
  const escenario = preparar();
  const resultado = await escenario.ejecutar({
    entorno: { GITHUB_EVENT_NAME: "workflow_run" },
    evento: { workflow_run: ejecucionPages },
  });
  assert.equal(resultado.omitido, false);
  assert.ok(
    escenario.peticiones.some(
      (p) => p.url.pathname === `/repos/${repositorio}/actions/runs/7`,
    ),
  );
  assert.equal(aCloudflare(escenario).length, 1);
});

for (const clave of [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ZONE_ID",
  "GITHUB_TOKEN",
]) {
  test(`sin ${clave} falla antes de efectuar peticiones`, async () => {
    const escenario = preparar();
    await assert.rejects(escenario.ejecutar({ entorno: { [clave]: "" } }));
    assert.equal(escenario.peticiones.length, 0);
  });
}

test("un identificador de zona inválido falla antes de construir la petición", async () => {
  const escenario = preparar();
  await assert.rejects(
    escenario.ejecutar({ entorno: { CLOUDFLARE_ZONE_ID: "../otra-zona" } }),
  );
  assert.equal(escenario.peticiones.length, 0);
});

for (const run of [
  { status: "in_progress", conclusion: null },
  { status: "completed", conclusion: "failure" },
  { status: "completed", conclusion: "cancelled" },
]) {
  test(`no purga si Pages sigue ${run.status}/${run.conclusion}`, async () => {
    const escenario = preparar({ run });
    await assert.rejects(escenario.ejecutar());
    assert.equal(aCloudflare(escenario).length, 0);
    assert.equal(alSitio(escenario).length, 0);
  });
}

test("un evento de una publicación anterior se omite sin purgar", async () => {
  const escenario = preparar({ shaActual: "c".repeat(40) });
  const resultado = await escenario.ejecutar({
    entorno: { GITHUB_EVENT_NAME: "workflow_run" },
    evento: { workflow_run: ejecucionPages },
  });
  assert.deepEqual(resultado, { omitido: true });
  assert.equal(aCloudflare(escenario).length, 0);
  assert.equal(alSitio(escenario).length, 0);
});

test("un HTTP 200 con success false no se anuncia como purga exitosa", async () => {
  const escenario = preparar({
    cloudflare: () =>
      json({
        success: false,
        errors: [{ code: 1000, message: "Rechazo simulado" }],
      }),
  });
  await assert.rejects(escenario.ejecutar());
  assert.equal(aCloudflare(escenario).length, 1);
  assert.equal(alSitio(escenario).length, 0);
});

test("un rechazo 403 falla sin reintentar", async () => {
  const escenario = preparar({
    cloudflare: () => json({ success: false }, 403),
  });
  await assert.rejects(escenario.ejecutar());
  assert.equal(aCloudflare(escenario).length, 1);
  assert.deepEqual(escenario.esperas, []);
});

test("un error transitorio 503 se reintenta y luego permite verificar", async () => {
  const escenario = preparar({
    cloudflare: (intento) =>
      intento === 1 ? json({ success: false }, 503) : json({ success: true }),
  });
  const resultado = await escenario.ejecutar();
  assert.equal(resultado.version, version);
  assert.equal(aCloudflare(escenario).length, 2);
  assert.deepEqual(escenario.esperas, [15000]);
});

test("un límite 429 permite hasta tres intentos con espera acotada", async () => {
  const escenario = preparar({
    cloudflare: (intento) =>
      intento < 3 ? json({ success: false }, 429) : json({ success: true }),
  });
  await escenario.ejecutar();
  assert.equal(aCloudflare(escenario).length, 3);
  assert.deepEqual(escenario.esperas, [15000, 30000]);
});

test("un fallo de red persistente termina después de tres intentos", async () => {
  const escenario = preparar({
    cloudflare: () => {
      throw new TypeError("Fallo de red simulado");
    },
  });
  await assert.rejects(escenario.ejecutar());
  assert.equal(aCloudflare(escenario).length, 3);
  assert.deepEqual(escenario.esperas, [15000, 30000]);
  assert.equal(alSitio(escenario).length, 0);
});

test("no da por verificado un HTML que sigue en la versión anterior", async () => {
  const escenario = preparar({
    publico: () => new Response('<html data-release="anterior"></html>'),
  });
  await assert.rejects(escenario.ejecutar());
  assert.equal(aCloudflare(escenario).length, 1);
  assert.equal(alSitio(escenario).length, 6);
  assert.deepEqual(escenario.esperas, [4000, 4000, 4000, 4000, 4000]);
});

test("la verificación acepta la versión nueva cuando aparece en el segundo intento", async () => {
  const escenario = preparar({
    publico: (intento) =>
      new Response(
        intento === 1 ? '<html data-release="anterior"></html>' : html,
      ),
  });
  const resultado = await escenario.ejecutar();
  assert.equal(resultado.version, version);
  assert.equal(alSitio(escenario).length, 2);
  assert.deepEqual(escenario.esperas, [4000]);
});

test("una respuesta JSON inválida de Cloudflare termina con error", async () => {
  const escenario = preparar({
    cloudflare: () => new Response("respuesta inválida", { status: 200 }),
  });
  await assert.rejects(escenario.ejecutar());
  assert.equal(alSitio(escenario).length, 0);
});
