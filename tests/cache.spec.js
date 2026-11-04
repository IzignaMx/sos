const { test, expect } = require("@playwright/test");

test("el diseño evita las respuestas antiguas del CDN mediante URLs versionadas", async ({
  page,
}) => {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      url.origin === "http://127.0.0.1:3000" &&
      /^\/(assets|i18n)\//.test(url.pathname) &&
      !url.searchParams.has("v")
    ) {
      await route.fulfill({
        status: 404,
        body: "Respuesta anterior almacenada por el CDN",
      });
      return;
    }
    await route.continue();
  });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(15, 15, 15)",
  );
  await expect(
    page.getByRole("slider", { name: "Nivel de claridad" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".hero__art img")
      .evaluate((img) => img.complete && img.naturalWidth > 0),
  ).toBeTruthy();
  await page.locator("[data-lang-toggle]").click();
  await page.locator('[data-lang-option="en"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
