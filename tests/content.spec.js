const { test, expect } = require("@playwright/test");

test("las soluciones aparecen antes del recorrido y su precio no depende de abrir detalles", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page
      .locator("#servicios")
      .evaluate(
        (el) =>
          !!(
            el.compareDocumentPosition(
              document.querySelector("[data-flow-story]"),
            ) & Node.DOCUMENT_POSITION_FOLLOWING
          ),
      ),
  ).toBeTruthy();
  const tarjeta = page.locator("#service-performance");
  await expect(tarjeta.locator(".service-card__price")).toBeVisible();
  await expect(tarjeta.locator(".badge-time")).toBeVisible();
  await expect(tarjeta.locator(".service-card__list")).toBeHidden();
  await tarjeta.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(tarjeta.locator(".service-card__list")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(tarjeta.locator(".service-card__list")).toBeHidden();
});

test("los detalles se pueden consultar sin JavaScript y conservan la información comercial", async ({
  browser,
}) => {
  const contexto = await browser.newContext({ javaScriptEnabled: false });
  const pagina = await contexto.newPage();
  await pagina.goto("http://127.0.0.1:3000/");
  for (const tarjeta of await pagina.locator(".service-card").all()) {
    await expect(tarjeta.locator(".service-card__price")).toBeVisible();
    await expect(tarjeta.locator("a")).toHaveAttribute(
      "href",
      /^https:\/\/wa.me\/525533760889/,
    );
    await tarjeta.locator("summary").click();
    await expect(tarjeta.locator(".service-card__list li")).toHaveCount(3);
    await expect(tarjeta.locator(".service-card__list")).toBeVisible();
  }
  await contexto.close();
});
