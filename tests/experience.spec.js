const { test, expect } = require("@playwright/test");

test("el laboratorio responde al teclado sin simular resultados comerciales", async ({
  page,
}) => {
  await page.goto("/");
  const control = page.getByRole("slider", { name: "Nivel de claridad" });
  await expect(control).toBeVisible();
  await control.focus();
  await page.keyboard.press("Home");
  await expect(control).toHaveValue("0");
  await expect(page.locator("[data-lab]")).toHaveAttribute(
    "data-clarity",
    "low",
  );
  await page.keyboard.press("End");
  await expect(control).toHaveValue("100");
  await expect(page.locator("[data-lab]")).toHaveAttribute(
    "data-clarity",
    "high",
  );
  await expect(page.locator('[data-i18n="editorial.labNote"]')).toBeVisible();
});

test("móvil conserva navegación, idiomas y enlaces de reserva", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".nav__links a").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.locator("[data-lang-toggle]").click();
  await page.locator('[data-lang-option="en"]').click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveText(/store/i);
  await expect(page.locator(".hero__actions a").first()).toHaveAttribute(
    "href",
    /^https:\/\/wa.me\/525533760889/,
  );
  await page.locator("#faq summary").first().click();
  await expect(page.locator("#faq details").first()).toHaveAttribute(
    "open",
    "",
  );
});

test("sin JavaScript el contenido y las reservas siguen disponibles", async ({
  browser,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("http://127.0.0.1:3000");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".service-card")).toHaveCount(4);
  await expect(page.locator(".hero__actions a").first()).toBeVisible();
  await expect(page.locator("[data-lab-controls]")).toBeHidden();
  await context.close();
});
