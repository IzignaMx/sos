const { test, expect } = require("@playwright/test");

test("conserva los tokens, fuente y parentesco visible de IzignaMx", async ({
  page,
}) => {
  const externalFonts = [];
  page.on("request", (request) => {
    if (/fonts\.(googleapis|gstatic)/.test(request.url()))
      externalFonts.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS(
    "background-color",
    "rgb(15, 15, 15)",
  );
  await expect(page.locator(".brand img")).toBeVisible();
  await expect(page.locator("[data-brand-home]")).toHaveAttribute(
    "href",
    "https://izignamx.com/",
  );
  expect(
    await page
      .locator("body")
      .evaluate((el) => getComputedStyle(el).fontFamily),
  ).toContain("Aileron");
  await expect(page.locator(".hero .hero__actions .btn--primary")).toHaveCSS(
    "background-color",
    "rgb(46, 150, 255)",
  );
  await expect(page.locator(".hero .hero__actions .btn--primary")).toHaveCSS(
    "color",
    "rgb(15, 15, 15)",
  );
  expect(externalFonts).toEqual([]);
});

test("el recorrido tiene estados útiles y sigue legible con movimiento reducido", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("[data-flow-story]")).toBeVisible();
  await expect(page.locator("[data-flow-step]")).toHaveCount(3);
  await expect(page.locator("[data-flow-visual]")).toBeVisible();
  await expect(page.locator("[data-flow-visual]")).toHaveCSS(
    "position",
    "relative",
  );
  await expect(page.locator("[data-service-guide]")).toBeVisible();
});

test("la orientación conserva el catálogo real y actualiza la sugerencia al traducir", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-service-choice="performance"]').click();
  await expect(page.locator("[data-service-result]")).toBeVisible();
  await expect(page.locator("[data-recommended-price]")).toHaveText(
    "Desde $1,200 MXN",
  );
  await expect(page.locator("[data-recommended-link]")).toHaveAttribute(
    "href",
    "#service-performance",
  );
  await page.locator("[data-lang-toggle]").click();
  await page.locator('[data-lang-option="en"]').click();
  await expect(page.locator("[data-recommended-title]")).toHaveText(
    require("../i18n/en.json").services.cards.performance.title,
  );
  await expect(page.locator(".service-card")).toHaveCount(4);
  await page.locator("[data-service-reset]").click();
  await expect(page.locator("[data-service-result]")).toBeHidden();
});

test("en móvil el gráfico acompaña cada etapa sin tapar sus títulos", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  for (let index = 0; index < 3; index++) {
    const step = page.locator(`[data-flow-step][data-step="${index}"]`);
    await step.evaluate((el) =>
      window.scrollTo({
        top:
          window.scrollY +
          el.getBoundingClientRect().top +
          el.offsetHeight / 2 -
          innerHeight / 2,
        behavior: "instant",
      }),
    );
    await expect(page.locator("[data-flow-story]")).toHaveAttribute(
      "data-flow-stage",
      String(index),
    );
    const uncovered = await step.locator("h3").evaluate((el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
      );
      return hit === el || el.contains(hit);
    });
    expect(uncovered).toBeTruthy();
  }
});
