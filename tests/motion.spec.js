const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

// Página aislada: valida el comportamiento sin depender de imágenes ni terceros.
const pagina = `<!doctype html><html lang="es"><head><style>
[data-artwork] { width: 400px; height: 300px; }
[data-reveal] { margin-top: 1200px; }
</style></head><body>
<button type="button" data-motion-toggle aria-pressed="false">
<span data-motion-on>Pausar movimiento</span><span data-motion-off hidden>Activar movimiento</span>
</button><div data-artwork aria-hidden="true"></div>
<p data-reveal>El contenido siempre permanece accesible.</p>
<script src="/assets/js/editorial.js"></script></body></html>`;

async function abrirPagina(page) {
  await page.route("**/motion-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: pagina }),
  );
  await page.route("**/assets/js/editorial.js", (route) => {
    const archivo = path.join(__dirname, "../assets/js/editorial.js");
    return route.fulfill({
      contentType: "text/javascript",
      body: fs.existsSync(archivo) ? fs.readFileSync(archivo, "utf8") : "",
    });
  });
  await page.goto("http://localhost:3000/motion-fixture");
}

test("permite pausar con teclado y conserva la elección tras recargar", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await abrirPagina(page);
  const boton = page.locator("[data-motion-toggle]");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "active");
  await boton.focus();
  await page.keyboard.press("Enter");
  await expect(boton).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("[data-motion-off]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await page.reload();
  await expect(boton).toHaveAttribute("aria-pressed", "true");
  await boton.click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "active");
});

test("respeta los cambios del sistema y mantiene visibles las secciones", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrirPagina(page);
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
  await expect(page.locator("[data-reveal]")).toBeVisible();
  await expect(page.locator("[data-motion-toggle]")).toBeDisabled();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "active");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
});

test("limita el desplazamiento de la pieza y lo restablece al pausar", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await abrirPagina(page);
  const pieza = page.locator("[data-artwork]");
  const caja = await pieza.boundingBox();
  await page.mouse.move(caja.x + caja.width - 1, caja.y + caja.height - 1);
  await expect
    .poll(async () =>
      pieza.evaluate((el) => parseFloat(el.style.getPropertyValue("--art-x"))),
    )
    .toBeGreaterThan(0);
  const valores = await pieza.evaluate((el) =>
    ["--art-x", "--art-y"].map((clave) =>
      parseFloat(el.style.getPropertyValue(clave)),
    ),
  );
  expect(valores.every((valor) => Math.abs(valor) <= 8)).toBeTruthy();
  await page.locator("[data-motion-toggle]").click();
  await expect
    .poll(async () =>
      pieza.evaluate((el) => el.style.getPropertyValue("--art-x")),
    )
    .toBe("0px");
});

test("funciona sin almacenamiento disponible", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Almacenamiento no disponible", "SecurityError");
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await abrirPagina(page);
  await page.locator("[data-motion-toggle]").click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "paused");
});
