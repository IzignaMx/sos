const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

// Fixture independiente: el catálogo es la única fuente de los datos recomendados.
const servicios = [
  [
    "performance",
    "Velocidad + diseño",
    "Revisión de velocidad y apps",
    "$1,200 MXN",
    "24–48 h",
  ],
  [
    "wordpress",
    "Seguridad + limpieza",
    "Revisión de seguridad y plugins",
    "$1,500 MXN",
    "48–72 h",
  ],
  [
    "checkout",
    "Checkout sin fricción",
    "Revisión de textos y validaciones",
    "$1,800 MXN",
    "48–72 h",
  ],
  [
    "audit",
    "Auditoría Flash",
    "Diagnóstico para priorizar mejoras",
    "$1,200 MXN",
    "48 h",
  ],
];
const pagina = `<!doctype html><html lang="es"><head><meta charset="utf-8"></head><body>
<form data-service-guide hidden>
${servicios.map(([id]) => `<button type="button" data-service-choice="${id}" aria-pressed="false">${id}</button>`).join("")}
<button type="button" data-service-reset>Ver todos</button>
<div data-service-result hidden aria-live="polite">
<h2 data-recommended-title></h2><p data-recommended-summary></p>
<span data-recommended-price></span><span data-recommended-duration></span>
<a data-recommended-link>Ver alcance</a></div></form>
<div style="height:1200px" aria-hidden="true"></div>
${servicios.map(([id, titulo, resumen, precio, plazo]) => `<article data-service-id="${id}" id="service-${id}"><h3 class="service-card__title">${titulo}</h3><p class="service-card__summary">${resumen}</p><span class="service-card__price">${precio}</span><span class="badge-time">${plazo}</span></article>`).join("")}
<script src="/assets/js/service-guide.js"></script></body></html>`;

async function abrirPagina(page, conScript = true) {
  await page.route("**/guide-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: pagina }),
  );
  await page.route("**/assets/js/service-guide.js", (route) => {
    const archivo = path.join(__dirname, "../assets/js/service-guide.js");
    return route.fulfill({
      contentType: "text/javascript",
      body:
        conScript && fs.existsSync(archivo)
          ? fs.readFileSync(archivo, "utf8")
          : "",
    });
  });
  await page.goto("http://127.0.0.1:3000/guide-fixture");
}

test("seleccionar con teclado orienta sin navegar ni desplazar el catálogo", async ({
  page,
}) => {
  await abrirPagina(page);
  await expect(page.locator("[data-service-guide]")).toBeVisible();
  await expect(
    page.locator('[data-service-choice][aria-pressed="true"]'),
  ).toHaveCount(0);
  const opcion = page.locator('[data-service-choice="wordpress"]');
  await opcion.focus();
  const posicion = await page.evaluate(() => scrollY);
  const direccion = page.url();
  const ventanas = [];
  page.on("popup", (ventana) => ventanas.push(ventana));
  await page.keyboard.press("Enter");
  await expect(opcion).toBeFocused();
  await expect(opcion).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-recommended-title]")).toHaveText(
    "Seguridad + limpieza",
  );
  await expect(page.locator("[data-recommended-summary]")).toHaveText(
    "Revisión de seguridad y plugins",
  );
  await expect(page.locator("[data-recommended-price]")).toHaveText(
    "$1,500 MXN",
  );
  await expect(page.locator("[data-recommended-duration]")).toHaveText(
    "48–72 h",
  );
  await expect(page.locator("[data-recommended-link]")).toHaveAttribute(
    "href",
    "#service-wordpress",
  );
  await expect(page.locator('[data-service-id="wordpress"]')).toHaveAttribute(
    "data-recommended",
    "true",
  );
  expect(page.url()).toBe(direccion);
  expect(await page.evaluate(() => scrollY)).toBe(posicion);
  expect(ventanas).toHaveLength(0);
  for (const [id] of servicios)
    await expect(page.locator(`[data-service-id="${id}"]`)).toBeVisible();
});

test("cambiar y restablecer la elección conserva todos los servicios y el foco", async ({
  page,
}) => {
  await abrirPagina(page);
  await page.locator('[data-service-choice="performance"]').click();
  await page.locator('[data-service-choice="checkout"]').click();
  await expect(
    page.locator('[data-service-choice][aria-pressed="true"]'),
  ).toHaveCount(1);
  await expect(
    page.locator('[data-service-choice="performance"]'),
  ).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("[data-service-id][data-recommended]")).toHaveCount(
    1,
  );
  await expect(page.locator("[data-recommended-link]")).toHaveAttribute(
    "href",
    "#service-checkout",
  );
  const restablecer = page.locator("[data-service-reset]");
  await restablecer.focus();
  await page.keyboard.press("Space");
  await expect(restablecer).toBeFocused();
  await expect(page.locator("[data-service-result]")).toBeHidden();
  await expect(
    page.locator('[data-service-choice][aria-pressed="true"]'),
  ).toHaveCount(0);
  await expect(page.locator("[data-service-id][data-recommended]")).toHaveCount(
    0,
  );
});

test("la recomendación sigue el idioma del catálogo sin cambiar la selección", async ({
  page,
}) => {
  await abrirPagina(page);
  await page.locator('[data-service-choice="audit"]').click();
  await page.evaluate(() => {
    const tarjeta = document.querySelector('[data-service-id="audit"]');
    tarjeta.querySelector(".service-card__title").textContent = "Flash audit";
    tarjeta.querySelector(".service-card__summary").textContent =
      "Identify priorities";
    tarjeta.querySelector(".service-card__price").textContent =
      "From MXN 1,200";
    tarjeta.querySelector(".badge-time").textContent = "48 hours";
    document.dispatchEvent(new CustomEvent("sos:languagechange"));
  });
  await expect(page.locator("[data-recommended-title]")).toHaveText(
    "Flash audit",
  );
  await expect(page.locator("[data-recommended-summary]")).toHaveText(
    "Identify priorities",
  );
  await expect(page.locator("[data-recommended-price]")).toHaveText(
    "From MXN 1,200",
  );
  await expect(page.locator("[data-recommended-duration]")).toHaveText(
    "48 hours",
  );
  await expect(page.locator('[data-service-choice="audit"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("sin el script se conserva el catálogo y no aparece un control inactivo", async ({
  page,
}) => {
  await abrirPagina(page, false);
  await expect(page.locator("[data-service-guide]")).toBeHidden();
  await expect(page.locator("[data-service-id]")).toHaveCount(4);
  for (const [id] of servicios)
    await expect(page.locator(`[data-service-id="${id}"]`)).toBeVisible();
});
