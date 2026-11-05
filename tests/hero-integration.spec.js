const { test, expect } = require("@playwright/test");

async function comprobarEsculturaPintada(page, canvas) {
  // Inspeccionar el fotograma compuesto; un canvas visible puede seguir vacío.
  await expect
    .poll(async () => {
      const captura = await canvas.screenshot();
      return page.evaluate(async (png) => {
        const imagen = new Image();
        imagen.src = `data:image/png;base64,${png}`;
        await imagen.decode();
        const muestra = document.createElement("canvas");
        muestra.width = muestra.height = 1;
        const contexto = muestra.getContext("2d");
        let puntosIluminados = 0;
        for (const y of [0.25, 0.5, 0.75]) {
          for (const x of [0.25, 0.5, 0.75]) {
            contexto.drawImage(
              imagen,
              imagen.width * x,
              imagen.height * y,
              1,
              1,
              0,
              0,
              1,
              1,
            );
            const pixel = contexto.getImageData(0, 0, 1, 1).data;
            if (Math.max(pixel[0], pixel[1], pixel[2]) > 40) puntosIluminados++;
          }
        }
        return puntosIluminados;
      }, captura.toString("base64"));
    })
    .toBeGreaterThanOrEqual(2);
}

test("la escultura conserva nitidez en pantallas densas sin superar su presupuesto de píxeles", async ({
  browser,
}) => {
  const contexto = await browser.newContext({
    deviceScaleFactor: 3,
    viewport: { width: 1440, height: 1050 },
    serviceWorkers: "block",
  });
  try {
    const page = await contexto.newPage();
    await page.goto("/");
    await expect(page.locator("[data-hero3d]")).toHaveAttribute(
      "data-state",
      "ready",
      { timeout: 20000 },
    );
    const canvas = page.locator("[data-hero3d-canvas] canvas");
    await comprobarEsculturaPintada(page, canvas);
    const resolucion = () =>
      canvas.evaluate((elemento) => {
        const caja = elemento.getBoundingClientRect();
        return {
          densidad: elemento.width / caja.width,
          pixeles: elemento.width * elemento.height,
        };
      });
    await expect
      .poll(async () => (await resolucion()).densidad)
      .toBeGreaterThan(1.98);
    expect((await resolucion()).densidad).toBeLessThanOrEqual(2);
    await page.setViewportSize({ width: 740, height: 1050 });
    await page.locator("[data-hero3d]").scrollIntoViewIfNeeded();
    await expect
      .poll(async () => (await resolucion()).pixeles)
      .toBeLessThanOrEqual(1600000);
    expect((await resolucion()).densidad).toBeGreaterThan(1.5);
    await page.close();
    const ahorro = await contexto.newPage();
    await ahorro.addInitScript(() => {
      Object.defineProperty(navigator, "connection", {
        value: { saveData: true },
      });
    });
    await ahorro.goto("/");
    await expect(ahorro.locator("[data-hero3d]")).toHaveAttribute(
      "data-state",
      "ready",
      { timeout: 20000 },
    );
    const densidadAhorro = await ahorro
      .locator("[data-hero3d-canvas] canvas")
      .evaluate(
        (elemento) => elemento.width / elemento.getBoundingClientRect().width,
      );
    expect(densidadAhorro).toBeGreaterThan(0.99);
    expect(densidadAhorro).toBeLessThanOrEqual(1);
  } finally {
    await contexto.close();
  }
});

test("carga el GLB publicado con sus materiales bajo la política CSP del sitio", async ({
  page,
  browserName,
}) => {
  await page.addInitScript(() => {
    window.infraccionesModelo = [];
    document.addEventListener("securitypolicyviolation", (evento) => {
      if (
        evento.blockedURI.startsWith("blob:") ||
        evento.blockedURI.includes("hero3d") ||
        evento.blockedURI.includes("flow-sculpture")
      )
        window.infraccionesModelo.push(evento.violatedDirective);
    });
  });
  await page.goto("/");
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 20000 },
  );
  await expect(page.locator("[data-hero3d-canvas] canvas")).toBeVisible();
  await comprobarEsculturaPintada(
    page,
    page.locator("[data-hero3d-canvas] canvas"),
  );
  if (browserName === "chromium") {
    await expect(page.locator("[data-hero3d-canvas]")).toHaveAttribute(
      "data-renderer",
      "worker",
    );
  }
  await expect(page.locator("[data-hero3d] button:visible")).toHaveCount(0);
  await expect(page.locator("#hero3d-hint")).toHaveCount(0);
  await expect(page.locator("[data-hero3d-canvas]")).toHaveAttribute(
    "aria-describedby",
    "hero3d-keyboard",
  );
  expect(await page.evaluate(() => window.infraccionesModelo)).toEqual([]);
});

test("la portada arranca sola sin controles ni cambios de foco", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "connection", {
      value: { saveData: true },
    });
  });
  await page.goto("/");
  const escultura = page.locator("[data-hero3d]");
  await expect(escultura).toHaveAttribute(
    "data-model",
    /flow-sculpture\.glb\?v=/,
  );
  await expect(escultura.locator("img")).toBeVisible();
  await expect(
    escultura.getByRole("button", { includeHidden: true }),
  ).toHaveCount(0);
  await expect(escultura).not.toHaveAttribute("data-artwork", "");
  await expect(escultura).toHaveCSS("transform", "none");
  const enlace = page.locator('[data-i18n="hero.primaryCta"]');
  await enlace.focus();
  await expect(escultura).toHaveAttribute("data-state", "ready", {
    timeout: 20000,
  });
  await expect(enlace).toBeFocused();
  await page.locator("[data-lang-toggle]").click();
  await page.locator('[data-lang-option="en"]').click();
  await expect(escultura.locator("[data-hero3d-canvas]")).toHaveAttribute(
    "aria-label",
    require("../i18n/en.json").hero3d.label,
  );
});

test("la portada sigue siendo legible sin JavaScript", async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexto.newPage();
  await page.goto("/");
  await expect(page.locator("[data-hero3d] img")).toBeVisible();
  await expect(page.locator("[data-hero3d] button")).toHaveCount(0);
  await expect(page.locator("h1")).toContainText("tienda online");
  await contexto.close();
});
