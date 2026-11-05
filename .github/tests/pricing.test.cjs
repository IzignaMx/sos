const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const archivo = path.resolve(__dirname, "../../assets/js/pricing.js");
const ahora = Date.parse("2026-11-05T16:00:00Z");
const dia = 86400000;
const clave = "sos-usd-rate-v1";
const base = [1200, 1500, 1200, 1800];
const esperado = (importe, tasa = 0.053738, idioma = "en") =>
  new Intl.NumberFormat(idioma, {
    style: "currency",
    currency: "USD",
    currencyDisplay: "code",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(importe * tasa);
const respuesta = (rate = 0.055, date = "2026-11-05", extra = {}) => ({
  ok: true,
  json: async () => [{ date, base: "MXN", quote: "USD", rate, ...extra }],
});
const drenar = () => new Promise((resolve) => setImmediate(resolve));

function preparar({ cache, fetchImpl, almacenamientoBloqueado = false } = {}) {
  let reloj = ahora;
  let cambios = 0;
  const solicitudes = [];
  const almacen = new Map(
    cache === undefined ? [] : [[clave, JSON.stringify(cache)]],
  );
  const temporizadores = new Map();
  let siguienteTemporizador = 0;
  const precios = base.map((importe) => ({
    dataset: { priceMxn: String(importe) },
    textContent: `Desde $${importe.toLocaleString("en-US")} MXN`,
  }));
  const nota = { hidden: true, textContent: "" };
  const documento = new EventTarget();
  documento.documentElement = { lang: "es" };
  documento.querySelectorAll = (selector) =>
    selector === "[data-price-mxn]" ? precios : [];
  documento.querySelector = (selector) =>
    selector === "[data-pricing-note]" ? nota : null;
  documento.addEventListener("sos:priceschange", () => cambios++);
  const storage = {
    getItem: (key) => {
      if (almacenamientoBloqueado) throw new Error("Bloqueado");
      return almacen.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (almacenamientoBloqueado) throw new Error("Bloqueado");
      almacen.set(key, value);
    },
  };
  const fetch = (url, opciones) => {
    solicitudes.push({ url, opciones });
    return fetchImpl ? fetchImpl(url, opciones) : Promise.resolve(respuesta());
  };
  class Fecha extends Date {
    static now() {
      return reloj;
    }
  }
  const fuente = fs.readFileSync(archivo, "utf8");
  new vm.Script(fuente, { filename: archivo }).runInNewContext({
    document: documento,
    localStorage: storage,
    window: { localStorage: storage },
    fetch,
    Date: Fecha,
    Intl,
    CustomEvent,
    AbortController,
    setTimeout: (funcion, demora) => {
      const id = ++siguienteTemporizador;
      temporizadores.set(id, { funcion, demora });
      return id;
    },
    clearTimeout: (id) => temporizadores.delete(id),
  });
  const idioma = (language) => {
    const es = language.split("-")[0] === "es";
    const plantilla =
      language === "fr" ? "Dès ≈{{amount}}" : "From ≈{{amount}}";
    const catalog = {
      pricing: {
        from: es ? "Desde {{amount}}" : plantilla,
        note: "Estimaciones USD",
      },
    };
    documento.documentElement.lang = language;
    precios.forEach((precio, i) => {
      precio.textContent = es
        ? `Desde $${base[i].toLocaleString("en-US")} MXN`
        : plantilla.replace(
            "{{amount}}",
            esperado(base[i], 0.053738, language),
          );
    });
    documento.dispatchEvent(
      new CustomEvent("sos:languagechange", { detail: { language, catalog } }),
    );
  };
  return {
    precios,
    nota,
    solicitudes,
    almacen,
    temporizadores,
    idioma,
    avanzar: (ms) => {
      reloj += ms;
    },
    cambios: () => cambios,
  };
}

test("el español conserva MXN sin consultar ni mostrar conversión", async () => {
  const prueba = preparar();
  prueba.idioma("es-MX");
  await drenar();
  assert.equal(prueba.precios[0].textContent, "Desde $1,200 MXN");
  assert.equal(prueba.nota.hidden, true);
  assert.equal(prueba.solicitudes.length, 0);
  assert.equal(prueba.cambios(), 1);
});

test("convierte desde importes base y actualiza las recomendaciones al recibir la tasa", async () => {
  const prueba = preparar();
  prueba.idioma("en");
  assert.equal(prueba.precios[0].textContent, `From ≈${esperado(1200)}`);
  await drenar();
  assert.deepEqual(
    prueba.precios.map((p) => p.textContent),
    base.map((v) => `From ≈${esperado(v, 0.055)}`),
  );
  assert.equal(prueba.nota.hidden, false);
  assert.equal(prueba.cambios(), 2);
  assert.equal(prueba.solicitudes.length, 1);
  const { url, opciones } = prueba.solicitudes[0];
  assert.equal(url, "https://api.frankfurter.dev/v2/rates?base=MXN&quotes=USD");
  assert.equal(opciones.credentials, "omit");
  assert.equal(opciones.referrerPolicy, "no-referrer");
  assert.equal(opciones.cache, "no-store");
  assert.deepEqual(JSON.parse(prueba.almacen.get(clave)), {
    rate: 0.055,
    date: "2026-11-05",
    fetchedAt: ahora,
  });
  assert.equal(prueba.temporizadores.size, 0);
});

test("comparte una consulta y usa el idioma vigente si cambia antes de recibirla", async () => {
  let resolver;
  const prueba = preparar({
    fetchImpl: () =>
      new Promise((res) => {
        resolver = res;
      }),
  });
  prueba.idioma("en");
  prueba.idioma("fr");
  await drenar();
  assert.equal(prueba.solicitudes.length, 1);
  resolver(respuesta());
  await drenar();
  assert.equal(
    prueba.precios[0].textContent,
    `Dès ≈${esperado(1200, 0.055, "fr")}`,
  );
});

test("una respuesta tardía nunca sustituye MXN después de volver a español", async () => {
  let resolver;
  const prueba = preparar({
    fetchImpl: () =>
      new Promise((res) => {
        resolver = res;
      }),
  });
  prueba.idioma("en");
  await drenar();
  prueba.idioma("es");
  resolver(respuesta());
  await drenar();
  assert.equal(prueba.precios[1].textContent, "Desde $1,500 MXN");
  assert.equal(prueba.nota.hidden, true);
  prueba.idioma("en");
  assert.equal(prueba.precios[1].textContent, `From ≈${esperado(1500, 0.055)}`);
  assert.equal(prueba.solicitudes.length, 1);
});

test("reutiliza la tasa diaria guardada y la refresca al vencer su plazo", async () => {
  const prueba = preparar({
    cache: { rate: 0.06, date: "2026-11-05", fetchedAt: ahora - 1000 },
  });
  prueba.idioma("en");
  await drenar();
  assert.equal(prueba.precios[0].textContent, `From ≈${esperado(1200, 0.06)}`);
  assert.equal(prueba.solicitudes.length, 0);
  prueba.avanzar(dia);
  prueba.idioma("en");
  await drenar();
  assert.equal(prueba.solicitudes.length, 1);
  assert.equal(prueba.precios[0].textContent, `From ≈${esperado(1200, 0.055)}`);
});

test("sin red conserva la última tasa reciente y sin caché usa el respaldo", async () => {
  for (const cache of [
    undefined,
    { rate: 0.06, date: "2026-11-03", fetchedAt: ahora - 2 * dia },
  ]) {
    const prueba = preparar({
      cache,
      fetchImpl: async () => {
        throw new Error("Offline");
      },
    });
    prueba.idioma("en");
    await drenar();
    assert.equal(
      prueba.precios[0].textContent,
      `From ≈${esperado(1200, cache?.rate)}`,
    );
    assert.equal(prueba.nota.hidden, false);
    assert.equal(prueba.temporizadores.size, 0);
  }
});

test("descarta respuestas incorrectas, fechas irreales y tasas fuera de rango", async () => {
  const invalidas = [
    respuesta(0),
    respuesta(-1),
    respuesta(18.5),
    respuesta("0.055"),
    respuesta(NaN),
    respuesta(Infinity),
    respuesta(0.055, "2026-10-25"),
    respuesta(0.055, "2026-11-07"),
    respuesta(0.055, "2026-02-30"),
    respuesta(0.055, "2026-11-05", { base: "USD", quote: "MXN" }),
    { ok: false, json: async () => [] },
    { ok: true, json: async () => ({ rate: 0.055 }) },
    { ok: true, json: async () => [] },
    {
      ok: true,
      json: async () => {
        throw new Error("JSON inválido");
      },
    },
  ];
  for (const dato of invalidas) {
    const prueba = preparar({ fetchImpl: async () => dato });
    prueba.idioma("en");
    await drenar();
    assert.equal(prueba.precios[0].textContent, `From ≈${esperado(1200)}`);
    assert.equal(prueba.almacen.has(clave), false);
    assert.equal(prueba.solicitudes.length, 1);
  }
});

test("ignora caché manipulada, antigua o fechada en el futuro", async () => {
  for (const cache of [
    { rate: 0.07, date: "2026-10-01", fetchedAt: ahora },
    { rate: 0.07, date: "2026-11-05", fetchedAt: ahora + 1 },
    { rate: 0.07, date: "2026-11-05", fetchedAt: "hoy" },
    { rate: 50, date: "2026-11-05", fetchedAt: ahora },
  ]) {
    const prueba = preparar({
      cache,
      fetchImpl: async () => {
        throw new Error("Offline");
      },
    });
    prueba.idioma("en");
    await drenar();
    assert.equal(prueba.precios[0].textContent, `From ≈${esperado(1200)}`);
    assert.equal(prueba.solicitudes.length, 1);
  }
});

test("el almacenamiento bloqueado no impide convertir ni el timeout de tres segundos", async () => {
  const prueba = preparar({ almacenamientoBloqueado: true });
  prueba.idioma("en");
  await drenar();
  assert.equal(prueba.precios[0].textContent, `From ≈${esperado(1200, 0.055)}`);
  const lenta = preparar({
    fetchImpl: (_, { signal }) =>
      new Promise((_, reject) => {
        signal.addEventListener("abort", () => reject(new Error("Timeout")));
      }),
  });
  lenta.idioma("en");
  await drenar();
  assert.equal(lenta.temporizadores.size, 1);
  const [temporizador] = lenta.temporizadores.values();
  assert.equal(temporizador.demora, 3000);
  temporizador.funcion();
  await drenar();
  assert.equal(lenta.precios[0].textContent, `From ≈${esperado(1200)}`);
  assert.equal(lenta.temporizadores.size, 0);
});
