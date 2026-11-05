const { test, expect } = require("@playwright/test");

const api = "https://api.frankfurter.dev/v2/rates?base=MXN&quotes=USD";
const respuesta = (rate = 0.05) => [
  {
    date: new Date().toISOString().slice(0, 10),
    base: "MXN",
    quote: "USD",
    rate,
  },
];
const idiomas = [
  "en",
  "pt",
  "fr",
  "de",
  "it",
  "ja",
  "zh",
  "ar",
  "ru",
  "tr",
  "hi",
  "ko",
  "la",
  "eo",
  "nl",
  "sv",
  "pl",
  "uk",
  "vi",
];

async function idioma(page, lang) {
  await page.locator("[data-lang-toggle]").click();
  await page.locator(`[data-lang-option="${lang}"]`).click();
  await expect(page.locator("html")).toHaveAttribute(
    "lang",
    require(`../i18n/${lang}.json`).meta.lang,
  );
}

test.beforeEach(async ({ page }) => {
  // Estas pruebas no requieren el visor; evitan gastar GPU en una comprobación de precios.
  await page.route("**/assets/js/hero3d.js?*", (route) =>
    route.fulfill({ contentType: "text/javascript", body: "" }),
  );
});

test("conserva MXN en español y sincroniza el precio recomendado al recibir la cotización", async ({
  page,
}) => {
  let solicitudes = 0;
  let entregar;
  const pendiente = new Promise((resolve) => {
    entregar = resolve;
  });
  await page.route(api, async (route) => {
    solicitudes++;
    await pendiente;
    await route.fulfill({ json: respuesta() });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(page.locator(".service-card__price")).toHaveText([
    "Desde $1,200 MXN",
    "Desde $1,500 MXN",
    "Desde $1,200 MXN",
    "Desde $1,800 MXN",
  ]);
  expect(solicitudes).toBe(0);
  await page.locator('[data-service-choice="performance"]').click();
  await idioma(page, "en");
  await expect(page.locator("[data-recommended-price]")).toContainText("USD");
  await expect.poll(() => solicitudes).toBe(1);
  entregar();
  await expect(
    page.locator("#service-performance .service-card__price"),
  ).toHaveText(/USD\s*60\.00/);
  await expect(page.locator("[data-recommended-price]")).toHaveText(
    /USD\s*60\.00/,
  );
  await expect(page.locator("[data-pricing-note]")).toBeVisible();
  await idioma(page, "es");
  await expect(page.locator("[data-recommended-price]")).toHaveText(
    "Desde $1,200 MXN",
  );
  await expect(page.locator("[data-pricing-note]")).toBeHidden();
  expect(solicitudes).toBe(1);
});

test("todos los idiomas no españoles usan USD y reutilizan la cotización del día", async ({
  page,
}) => {
  let solicitudes = 0;
  await page.route(api, (route) => {
    solicitudes++;
    return route.fulfill({ json: respuesta() });
  });
  await page.goto("/");
  for (const lang of idiomas) {
    await idioma(page, lang);
    for (const precio of await page.locator(".service-card__price").all()) {
      await expect(precio).toContainText("USD");
      await expect(precio).not.toContainText(/MXN|₹|₩|¥|\{\{/);
    }
    await expect(page.locator("[data-pricing-note]")).toBeVisible();
  }
  expect(solicitudes).toBe(1);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await expect(page.locator(".service-card__price").first()).toContainText(
    "USD",
  );
  expect(solicitudes).toBe(1);
});

test("un proveedor inaccesible conserva precios útiles y el idioma guardado", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("sos-lang", "en"));
  await page.route(api, (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".service-card__price")).toHaveText([
    /USD\s*64\.49/,
    /USD\s*80\.61/,
    /USD\s*64\.49/,
    /USD\s*96\.73/,
  ]);
  await expect(page.locator("[data-pricing-note]")).toBeVisible();
});

test("una respuesta tardía no cambia MXN después de volver al español", async ({
  page,
}) => {
  let entregar;
  const pendiente = new Promise((resolve) => {
    entregar = resolve;
  });
  await page.route(api, async (route) => {
    await pendiente;
    await route.fulfill({ json: respuesta() });
  });
  await page.goto("/");
  await idioma(page, "en");
  await idioma(page, "es");
  const recibido = page.waitForResponse(api);
  entregar();
  await recibido;
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem("sos-usd-rate-v1"))?.rate,
      ),
    )
    .toBe(0.05);
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(page.locator(".service-card__price").first()).toHaveText(
    "Desde $1,200 MXN",
  );
  await expect(page.locator("[data-pricing-note]")).toBeHidden();
});

test("la última elección de idioma prevalece sobre una traducción tardía", async ({
  page,
}) => {
  let entregar;
  const pendiente = new Promise((resolve) => {
    entregar = resolve;
  });
  await page.route("**/i18n/en.json?*", async (route) => {
    await pendiente;
    await route.continue();
  });
  await page.route(api, (route) => route.fulfill({ json: respuesta() }));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await page.locator("[data-lang-toggle]").click();
  await page.locator('[data-lang-option="en"]').click();
  await idioma(page, "es");
  const recibido = page.waitForResponse(/i18n\/en\.json/);
  entregar();
  await recibido;
  // Esperar que el procesamiento de la respuesta se complete en el navegador.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "es-MX");
  await expect(page.locator(".service-card__price").first()).toHaveText(
    "Desde $1,200 MXN",
  );
});
