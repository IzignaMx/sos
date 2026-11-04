const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

const pagina = `<!doctype html><html lang="es"><head><style>
* { box-sizing: border-box; } body { margin: 0; }
.hero { height: 800px; } [data-artwork] { width: 400px; height: 300px; }
[data-flow-story] { height: 2400px; position: relative; }
[data-flow-visual] { position: sticky; top: 0; height: 200px; }
[data-flow-step] { height: 500px; } footer { height: 1000px; }
button { position: fixed; top: 5px; right: 5px; z-index: 2; }
</style></head><body>
<button type="button" data-motion-toggle aria-pressed="false"><span data-motion-on>Pausar movimiento</span><span data-motion-off hidden>Activar movimiento</span></button>
<section class="hero"><div data-artwork></div></section>
<section data-flow-story><div data-flow-visual></div><p data-flow-step data-step="0">Detectar</p><p data-flow-step data-step="1">Reconectar</p><p data-flow-step data-step="2">Activar</p></section><footer></footer>
<script src="/assets/js/editorial.js"></script></body></html>`;

async function abrir(page, reducedMotion = "no-preference") {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.emulateMedia({ reducedMotion });
  await page.route("**/flow-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: pagina }),
  );
  await page.route("**/assets/js/editorial.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: fs.readFileSync(
        path.join(__dirname, "../assets/js/editorial.js"),
        "utf8",
      ),
    }),
  );
  await page.goto("http://127.0.0.1:3000/flow-fixture");
}
const progreso = (page) =>
  page
    .locator("[data-flow-story]")
    .getAttribute("data-flow-progress")
    .then(Number);

test("el recorrido avanza, invierte y actualiza las tres etapas sin ocultar textos", async ({
  page,
}) => {
  await abrir(page);
  const historia = page.locator("[data-flow-story]");
  await expect(historia).toHaveAttribute("data-flow-stage", "0");
  await page.evaluate(() => scrollTo(0, 1600));
  await expect.poll(() => progreso(page)).toBeCloseTo(0.5, 2);
  await expect(historia).toHaveAttribute("data-flow-stage", "1");
  await page.evaluate(() => scrollTo(0, 2400));
  await expect.poll(() => progreso(page)).toBe(1);
  await expect(historia).toHaveAttribute("data-flow-stage", "2");
  await expect(page.locator('[data-flow-step][data-active="true"]')).toHaveText(
    "Activar",
  );
  await page.evaluate(() => scrollTo(0, 800));
  await expect.poll(() => progreso(page)).toBe(0);
  await expect(historia).toHaveAttribute("data-flow-stage", "0");
  await expect(page.locator("[data-flow-step]")).toHaveCount(3);
  for (const paso of await page.locator("[data-flow-step]").all())
    await expect(paso).toBeVisible();
});

test("la pausa y el movimiento reducido fijan la escena final y permiten reanudar", async ({
  page,
}) => {
  await abrir(page);
  await page.evaluate(() => scrollTo(0, 1200));
  await expect.poll(() => progreso(page)).toBeCloseTo(0.25, 2);
  await page.locator("[data-motion-toggle]").click();
  await expect.poll(() => progreso(page)).toBe(1);
  await expect(page.locator("[data-flow-visual]")).toHaveCSS(
    "--flow-join",
    "1",
  );
  await expect(page.locator("[data-flow-visual]")).toHaveCSS(
    "--flow-turn",
    "0deg",
  );
  await page.evaluate(() => scrollTo(0, 800));
  await expect.poll(() => progreso(page)).toBe(1);
  await page.locator("[data-motion-toggle]").click();
  await expect.poll(() => progreso(page)).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => progreso(page)).toBe(1);
  await expect(page.locator("[data-motion-toggle]")).toBeDisabled();
});

test("recalcula el recorrido al cambiar de tamaño y limita el desplazamiento de portada", async ({
  page,
}) => {
  await abrir(page);
  await page.evaluate(() => scrollTo(0, 400));
  await expect
    .poll(() =>
      page
        .locator("[data-artwork]")
        .evaluate((el) => Number(el.style.getPropertyValue("--hero-scroll"))),
    )
    .toBeCloseTo(0.5, 2);
  await page.evaluate(() => scrollTo(0, 1600));
  await expect.poll(() => progreso(page)).toBeCloseTo(0.5, 2);
  await page.setViewportSize({ width: 1000, height: 600 });
  await expect.poll(() => progreso(page)).toBeCloseTo(800 / 1800, 2);
  await page.evaluate(() => scrollTo(0, 0));
  await expect
    .poll(() =>
      page
        .locator("[data-artwork]")
        .evaluate((el) => Number(el.style.getPropertyValue("--hero-scroll"))),
    )
    .toBe(0);
});

test("no mantiene un bucle de animación después de terminar el scroll", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.requestAnimationFrame;
    window.fotogramasSolicitados = 0;
    window.requestAnimationFrame = (callback) => {
      window.fotogramasSolicitados++;
      return original.call(window, callback);
    };
  });
  await abrir(page);
  await page.evaluate(() => scrollTo(0, 1600));
  await expect.poll(() => progreso(page)).toBeCloseTo(0.5, 2);
  // Dos ventanas de observación acotadas detectan un RAF continuo no solicitado.
  await page.waitForTimeout(100);
  const anterior = await page.evaluate(() => window.fotogramasSolicitados);
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.fotogramasSolicitados)).toBe(
    anterior,
  );
  await page.evaluate(() => scrollTo(0, 3400));
  await page.waitForTimeout(100);
  const fueraDePantalla = await page.evaluate(
    () => window.fotogramasSolicitados,
  );
  await page.evaluate(() => scrollTo(0, 3300));
  await page.waitForTimeout(100);
  expect(await page.evaluate(() => window.fotogramasSolicitados)).toBe(
    fueraDePantalla,
  );
});

test("en móvil la etapa sigue al texto centrado y cada gráfico tiene progreso propio", async ({
  page,
}) => {
  await abrir(page);
  await page.addStyleTag({
    content: `
    @media (max-width: 760px) {
      [data-flow-visual] { position: static; }
      [data-flow-step] { height: 300px; }
      [data-flow-step]:first-of-type { height: 1200px; }
    }
  `,
  });
  await page.setViewportSize({ width: 390, height: 800 });
  const historia = page.locator("[data-flow-story]");
  const pasos = page.locator("[data-flow-step]");
  for (const indice of [0, 1, 2, 1, 0]) {
    await pasos
      .nth(indice)
      .evaluate((el) =>
        scrollBy(
          0,
          el.getBoundingClientRect().top +
            el.getBoundingClientRect().height / 2 -
            innerHeight / 2,
        ),
      );
    await expect(historia).toHaveAttribute("data-flow-stage", String(indice));
    await expect(pasos.nth(indice)).toHaveAttribute("data-active", "true");
  }
  const paso = pasos.nth(1);
  for (const [posicion, esperado] of [
    [0.8, 0],
    [0.575, 0.5],
    [0.35, 1],
    [0.8, 0],
  ]) {
    await paso.evaluate(
      (el, posicion) =>
        scrollBy(0, el.getBoundingClientRect().top - innerHeight * posicion),
      posicion,
    );
    await expect
      .poll(() =>
        paso.evaluate((el) =>
          Number(el.style.getPropertyValue("--step-progress")),
        ),
      )
      .toBeCloseTo(esperado, 2);
  }
  await page.locator("[data-motion-toggle]").click();
  for (const paso of await pasos.all())
    await expect(paso).toHaveCSS("--step-progress", "1");
  await page.locator("[data-motion-toggle]").click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const paso of await pasos.all())
    await expect(paso).toHaveCSS("--step-progress", "1");
});
