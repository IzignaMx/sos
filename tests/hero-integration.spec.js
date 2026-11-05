const { test, expect } = require("@playwright/test");

test("carga el GLB publicado con sus texturas bajo la política CSP del sitio", async ({
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
