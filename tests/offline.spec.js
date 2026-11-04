const { test, expect } = require("@playwright/test");

test("la PWA conserva arte, estilos y laboratorio después de desconectar", async ({
  browser,
}) => {
  const context = await browser.newContext({
    serviceWorkers: "allow",
    locale: "es-MX",
  });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
    }
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("h1")).toBeVisible();
  expect(
    await page
      .locator(".hero__art img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBeTruthy();
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(238, 234, 226)",
  );
  const slider = page.getByRole("slider", { name: "Nivel de claridad" });
  await slider.focus();
  await page.keyboard.press("End");
  await expect(slider).toHaveValue("100");
  await context.close();
});

test("árabe y ruso conservan traducción y ancho a 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  for (const language of ["en", "ar", "ru", "es"]) {
    await page.locator("[data-lang-toggle]").click();
    await page.locator(`[data-lang-option="${language}"]`).click();
    await expect(page.locator("html")).toHaveAttribute(
      "lang",
      language === "es" ? "es-MX" : language,
    );
    const catalog = require(`../i18n/${language}.json`);
    await expect(page.locator("#lab-title")).toHaveText(
      catalog.editorial.labTitle,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});
