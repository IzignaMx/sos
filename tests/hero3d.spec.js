const { test, expect } = require("@playwright/test");

// CI prepara WebGL por software; un reintento puede consumir dos cargas de 20 s.
test.setTimeout(45000);

// Malla asimétrica diminuta: prueba el renderizado y los gestos sin depender del proveedor.
function modeloDePrueba({ texturaFallida = false } = {}) {
  const posiciones = new Float32Array([
    -1, -1, 0, 1, -1, 0, 0, 1, 0, -1, -1, 0, 0, 1, 0, 0, 0, -1, 1, -1, 0, 0, 0,
    -1, 0, 1, 0, -1, -1, 0, 0, 0, -1, 1, -1, 0,
  ]);
  const datos = Buffer.from(posiciones.buffer);
  const documento = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, material: 0 }] }],
    materials: [
      {
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [0.03, 0.3, 1, 1],
          metallicFactor: 0.5,
          roughnessFactor: 0.3,
        },
      },
    ],
    buffers: [{ byteLength: datos.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: datos.length }],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 12,
        type: "VEC3",
        min: [-1, -1, -1],
        max: [1, 1, 0],
      },
    ],
  };
  if (texturaFallida) {
    documento.images = [{ uri: "/textura-inexistente.png?v=prueba" }];
    documento.textures = [{ source: 0 }];
    documento.materials[0].pbrMetallicRoughness.baseColorTexture = { index: 0 };
  }
  const json = Buffer.from(JSON.stringify(documento));
  const jsonAlineado = Buffer.alloc(Math.ceil(json.length / 4) * 4, 32);
  json.copy(jsonAlineado);
  const cabecera = Buffer.alloc(20);
  cabecera.writeUInt32LE(0x46546c67, 0);
  cabecera.writeUInt32LE(2, 4);
  cabecera.writeUInt32LE(28 + jsonAlineado.length + datos.length, 8);
  cabecera.writeUInt32LE(jsonAlineado.length, 12);
  cabecera.writeUInt32LE(0x4e4f534a, 16);
  const binario = Buffer.alloc(8);
  binario.writeUInt32LE(datos.length, 0);
  binario.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([cabecera, jsonAlineado, binario, datos]);
}

const pagina = `<!doctype html><html lang="es"><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:"><style>
body { margin: 0; background: #0f0f0f; min-height: 2000px; }
[data-hero3d] { width: 400px; height: 400px; position: relative; }
[data-hero3d-poster], [data-hero3d-canvas] { position:absolute; inset:0; width:100%; height:100%; }
[data-hero3d-canvas] { touch-action: pan-y pinch-zoom; outline: 0; }
[data-hero3d] canvas { width:100%; height:100%; }
[data-state="ready"] [data-hero3d-poster] { opacity:0; }
[data-hero3d-load], [data-hero3d-status] { position:absolute; top:420px; z-index:2; }
[data-hero3d-status] { top:450px; }
[hidden] { display:none !important; }
</style></head><body>
<div data-hero3d data-model="/modelo.glb?v=prueba" data-state="poster">
<img data-hero3d-poster alt="" src="/assets/img/flow-sculpture-640.webp?v=prueba">
<div data-hero3d-canvas tabindex="0" role="group" aria-label="Escultura interactiva"></div>
<button data-hero3d-load hidden>Explorar en 3D</button>
<p data-hero3d-status role="status"><span data-hero3d-loading hidden>Cargando</span><span data-hero3d-error hidden>Conservamos la imagen</span></p>
</div><a href="#final">Continuar leyendo</a><script src="/assets/js/hero3d.js?v=prueba" defer></script></body></html>`;

async function abrir(
  page,
  { fallo = false, ahorro = false, sinWebGL = false } = {},
) {
  await page.addInitScript(
    ({ ahorro, sinWebGL }) => {
      if (ahorro)
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true },
        });
      if (sinWebGL) {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (tipo, ...opciones) {
          return tipo === "webgl2" || tipo === "webgl"
            ? null
            : original.call(this, tipo, ...opciones);
        };
      }
      window.fotogramas = 0;
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = (funcion) => {
        window.fotogramas++;
        return raf(funcion);
      };
    },
    { ahorro, sinWebGL },
  );
  await page.route("**/hero3d-fixture", (route) =>
    route.fulfill({ contentType: "text/html", body: pagina }),
  );
  await page.route("**/modelo.glb?*", async (route) => {
    await route.fulfill(
      fallo
        ? { status: 503, body: "No disponible" }
        : { contentType: "model/gltf-binary", body: modeloDePrueba() },
    );
  });
  await page.goto("/hero3d-fixture");
}

async function activar(page) {
  await page.locator("[data-hero3d-load]").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 20000 },
  );
  return page.locator("[data-hero3d-canvas] canvas");
}

test("gira una malla real al agarrar y con teclado, nunca por hover; restablece la vista", async ({
  page,
}) => {
  await abrir(page, { ahorro: true });
  const canvas = await activar(page);
  await expect(page.locator("[data-hero3d-canvas]")).toBeFocused();
  const inicial = await canvas.screenshot();
  const caja = await canvas.boundingBox();
  await page.mouse.move(caja.x + 300, caja.y + 280);
  expect((await canvas.screenshot()).equals(inicial)).toBeTruthy();
  await page.mouse.down();
  await page.mouse.move(caja.x + 200, caja.y + 220, { steps: 8 });
  await page.mouse.up();
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("Home");
  expect((await canvas.screenshot()).equals(inicial)).toBeTruthy();
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await page.keyboard.press("Home");
  expect((await canvas.screenshot()).equals(inicial)).toBeTruthy();
  const reposo = await page.evaluate(() => window.fotogramas);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.fotogramas)).toBe(reposo);
});

test("el ahorro de datos conserva la portada hasta solicitar el modelo", async ({
  page,
}) => {
  const solicitudes = [];
  page.on("request", (request) => solicitudes.push(request.url()));
  await abrir(page, { ahorro: true });
  await expect(page.locator("[data-hero3d-load]")).toBeVisible();
  await page.waitForTimeout(350);
  expect(
    solicitudes.some((url) => /modelo\.glb|hero3d-renderer\.js/.test(url)),
  ).toBeFalsy();
  expect(
    await page
      .locator("[data-hero3d-poster]")
      .evaluate((img) => img.naturalWidth),
  ).toBeGreaterThan(0);
  await activar(page);
  expect(solicitudes.some((url) => url.includes("modelo.glb"))).toBeTruthy();
});

test("mantiene el foco durante la carga y respeta que se continúe leyendo", async ({
  page,
}) => {
  await abrir(page, { ahorro: true });
  let liberar;
  let avisar;
  const permiso = new Promise((resolve) => {
    liberar = resolve;
  });
  const solicitada = new Promise((resolve) => {
    avisar = resolve;
  });
  await page.unroute("**/modelo.glb?*");
  await page.route("**/modelo.glb?*", async (route) => {
    avisar();
    await permiso;
    await route.fulfill({
      contentType: "model/gltf-binary",
      body: modeloDePrueba(),
    });
  });
  const boton = page.locator("[data-hero3d-load]");
  await boton.focus();
  await page.keyboard.press("Enter");
  await solicitada;
  await expect(boton).toBeFocused();
  await expect(boton).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Continuar leyendo" }),
  ).toBeFocused();
  liberar();
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 20000 },
  );
  await expect(
    page.getByRole("link", { name: "Continuar leyendo" }),
  ).toBeFocused();
});

test("una visita normal descarga el motor y el modelo sólo al solicitar explorar en 3D", async ({
  page,
}) => {
  const solicitudes = [];
  page.on("request", (request) => solicitudes.push(request.url()));
  await abrir(page);
  await page.waitForTimeout(1000);
  expect(
    solicitudes.some((url) => /modelo\.glb|hero3d-renderer\.js/.test(url)),
  ).toBeFalsy();
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "poster",
  );
  await activar(page);
  await expect(page.locator("[data-hero3d-canvas]")).toBeFocused();
});

test("conserva la imagen y permite reintentar cuando el modelo no responde", async ({
  page,
}) => {
  await abrir(page, { fallo: true, ahorro: true });
  await page.locator("[data-hero3d-load]").click();
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
  );
  await expect(page.locator("[data-hero3d-error]")).toBeVisible();
  await expect(page.locator("[data-hero3d-canvas]")).toBeHidden();
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
  await page.unroute("**/modelo.glb?*");
  await page.route("**/modelo.glb?*", (route) =>
    route.fulfill({ contentType: "model/gltf-binary", body: modeloDePrueba() }),
  );
  await activar(page);
});

test("funciona como imagen sin WebGL y no atrapa el foco", async ({ page }) => {
  await abrir(page, { sinWebGL: true, ahorro: true });
  await page.locator("[data-hero3d-load]").click();
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
  );
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-hero3d-canvas]")).toBeHidden();
  await expect(page.locator("[data-hero3d-canvas]")).toHaveAttribute(
    "tabindex",
    "-1",
  );
});

test("la rueda desplaza la página y el movimiento reducido permite sólo gestos deliberados", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrir(page, { ahorro: true });
  const canvas = await activar(page);
  const inicial = await canvas.screenshot();
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await canvas.hover();
  await page.mouse.wheel(0, 240);
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
});

test("conserva la fotografía si no se pueden cargar las texturas del modelo", async ({
  page,
}) => {
  await abrir(page, { ahorro: true });
  await page.unroute("**/modelo.glb?*");
  await page.route("**/modelo.glb?*", (route) =>
    route.fulfill({
      contentType: "model/gltf-binary",
      body: modeloDePrueba({ texturaFallida: true }),
    }),
  );
  await page.locator("[data-hero3d-load]").click();
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
    { timeout: 20000 },
  );
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
});

test("la pérdida de WebGL devuelve la imagen y el foco al botón de carga", async ({
  page,
}) => {
  await abrir(page, { ahorro: true });
  const canvas = await activar(page);
  await page.locator("[data-hero3d-canvas]").focus();
  await canvas.evaluate((elemento) =>
    elemento
      .getContext("webgl2")
      .getExtension("WEBGL_lose_context")
      .loseContext(),
  );
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
  );
  await expect(page.locator("[data-hero3d-load]")).toBeFocused();
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
});

test("el arrastre táctil horizontal gira, el vertical conserva el scroll nativo", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "CDP permite verificar gestos táctiles nativos en Chromium.",
  );
  await page.setViewportSize({ width: 420, height: 800 });
  const cliente = await page.context().newCDPSession(page);
  await cliente.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  await abrir(page, { ahorro: true });
  const canvas = await activar(page);
  const inicial = await canvas.screenshot();
  const tacto = (type, x, y) =>
    cliente.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  await tacto("touchStart", 300, 200);
  for (let x = 290; x >= 180; x -= 10) await tacto("touchMove", x, 202);
  await tacto("touchEnd");
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("Home");
  await tacto("touchStart", 200, 320);
  for (let y = 310; y >= 140; y -= 10) await tacto("touchMove", 202, y);
  await tacto("touchEnd");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
  await cliente.detach();
});
