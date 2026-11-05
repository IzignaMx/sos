const { test, expect } = require("@playwright/test");

test("carga el GLB publicado con sus texturas bajo la política CSP del sitio", async ({
  page,
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
  await page.locator("[data-hero3d-load]").click();
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 20000 },
  );
  await expect(page.locator("[data-hero3d-canvas] canvas")).toBeVisible();
  await expect(page.locator("[data-hero3d-controls]")).toBeVisible();
  expect(await page.evaluate(() => window.infraccionesModelo)).toEqual([]);
});

test("la portada conserva la imagen y ofrece explorar la misma escultura en 3D", async ({
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
    escultura.getByRole("button", { name: "Explorar en 3D" }),
  ).toBeVisible();
  await expect(escultura).not.toHaveAttribute("data-artwork", "");
  await expect(escultura).toHaveCSS("transform", "none");
  await page.locator("[data-lang-toggle]").click();
  await page.locator('[data-lang-option="en"]').click();
  await expect(escultura.locator("[data-hero3d-load]")).toHaveText(
    "Explore in 3D",
  );
});

test("la portada sigue siendo legible sin JavaScript", async ({ browser }) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const page = await contexto.newPage();
  await page.goto("/");
  await expect(page.locator("[data-hero3d] img")).toBeVisible();
  await expect(page.locator("[data-hero3d-load]")).toBeHidden();
  await expect(page.locator("h1")).toContainText("tienda online");
  await contexto.close();
});
