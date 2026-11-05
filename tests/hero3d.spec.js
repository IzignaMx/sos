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

const pagina = `<!doctype html><html lang="es" data-motion="active"><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob:; worker-src 'self'"><style>
body { margin: 0; background: #0f0f0f; min-height: 2200px; }
.hero { height: 900px; }
figure { margin: 0; }
[data-hero3d] { width: 400px; height: 400px; position: relative; }
[data-hero3d-poster], [data-hero3d-canvas] { position:absolute; inset:0; width:100%; height:100%; }
[data-hero3d-canvas] { touch-action: pan-y pinch-zoom; outline: 0; }
[data-hero3d] canvas { width:100%; height:100%; }
[data-state="ready"] [data-hero3d-poster] { opacity:0; }
[data-hero3d-status] { position:absolute; top:420px; }
[hidden] { display:none !important; }
</style></head><body>
<section class="hero"><figure data-respaldo>
<div data-hero3d data-model="/modelo.glb?v=prueba" data-state="poster">
<img data-hero3d-poster alt="" src="/assets/img/flow-sculpture-640.webp?v=prueba">
<div data-hero3d-canvas tabindex="0" role="group" aria-label="Escultura interactiva" hidden></div>
<p data-hero3d-status role="status"><span data-hero3d-loading hidden>Cargando</span><span data-hero3d-error hidden>Conservamos la imagen</span></p>
</div></figure><a href="#final" style="position:absolute;top:450px">Continuar leyendo</a></section>
<script src="/assets/js/hero3d.js?v=prueba" defer></script></body></html>`;

async function abrir(
  page,
  {
    fallo = false,
    ahorro = false,
    sinWebGL = false,
    sinWorker = false,
    texturaFallida = false,
    demorar = null,
    fuera = false,
  } = {},
) {
  await page.addInitScript(
    ({ ahorro, sinWebGL, sinWorker }) => {
      if (ahorro)
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true },
        });
      if (sinWebGL || sinWorker)
        HTMLCanvasElement.prototype.transferControlToOffscreen = undefined;
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
    { ahorro, sinWebGL, sinWorker },
  );
  await page.route("**/hero3d-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: fuera
        ? pagina.replace(
            '<section class="hero">',
            '<section class="hero" style="margin-top:1200px">',
          )
        : pagina,
    }),
  );
  await page.context().route("**/modelo.glb?*", async (route) => {
    if (demorar) await demorar;
    await route.fulfill(
      fallo
        ? { status: 503, body: "No disponible" }
        : {
            contentType: "model/gltf-binary",
            body: modeloDePrueba({ texturaFallida }),
          },
    );
  });
  await page.goto("/hero3d-fixture");
}

async function esperarVisor(page) {
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "ready",
    { timeout: 20000 },
  );
  const canvas = page.locator("[data-hero3d-canvas] canvas");
  // ready confirma el Worker; el compositor todavía puede no presentar su primer frame.
  // Verificar la malla real evita usar un canvas vacío como referencia de movimiento.
  await expect
    .poll(async () => {
      const captura = await canvas.screenshot();
      return page.evaluate(async (png) => {
        const imagen = new Image();
        imagen.src = `data:image/png;base64,${png}`;
        await imagen.decode();
        const copia = document.createElement("canvas");
        copia.width = copia.height = 1;
        const contexto = copia.getContext("2d");
        contexto.drawImage(
          imagen,
          imagen.width / 2,
          imagen.height / 2,
          1,
          1,
          0,
          0,
          1,
          1,
        );
        const pixel = contexto.getImageData(0, 0, 1, 1).data;
        // La malla azul ocupa el centro; el fondo vacío de la fixture es #0f0f0f.
        return Math.max(pixel[0], pixel[1], pixel[2]) > 30;
      }, captura.toString("base64"));
    })
    .toBeTruthy();
  return canvas;
}

async function impulsar(page) {
  await page.mouse.move(300, 180);
  await page.waitForTimeout(700);
  await page.mouse.down();
  for (let x = 280; x >= 160; x -= 20) {
    await page.mouse.move(x, 180);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

async function comprobarReposo(page) {
  const reposo = await page.evaluate(() => window.fotogramas);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.fotogramas)).toBe(reposo);
}

test("al soltar conserva impulso y después deja de solicitar fotogramas", async ({
  page,
}) => {
  await abrir(page);
  const canvas = await esperarVisor(page);
  await impulsar(page);
  await page.waitForTimeout(60);
  const salida = await canvas.screenshot();
  await page.waitForTimeout(140);
  expect((await canvas.screenshot()).equals(salida)).toBeFalsy();
  await page.waitForTimeout(1800);
  await comprobarReposo(page);
});

test("sujetar la pieza antes de soltarla y cancelar el gesto eliminan el impulso", async ({
  page,
}) => {
  await abrir(page);
  const canvas = await esperarVisor(page);
  await page.mouse.move(300, 180);
  await page.waitForTimeout(700);
  await page.mouse.down();
  await page.mouse.move(170, 180, { steps: 8 });
  await page.waitForTimeout(350);
  await page.mouse.up();
  const detenida = await canvas.screenshot();
  await page.waitForTimeout(250);
  expect((await canvas.screenshot()).equals(detenida)).toBeTruthy();
  await page.mouse.down();
  await page.mouse.move(240, 180, { steps: 5 });
  await page
    .locator("[data-hero3d-canvas]")
    .dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  await comprobarReposo(page);
});

test("responde suavemente al mouse fuera de la pieza y vuelve al reposo", async ({
  page,
}) => {
  await abrir(page);
  const canvas = await esperarVisor(page);
  await page.waitForTimeout(100);
  const inicial = await canvas.screenshot();
  await page.mouse.move(950, 120);
  await page.waitForTimeout(650);
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await page.waitForTimeout(250);
  await comprobarReposo(page);
});

test("el scroll transforma el objeto sin mover artificialmente el marco ni mantener un bucle", async ({
  page,
}) => {
  await abrir(page);
  const canvas = await esperarVisor(page);
  // Mantener fijo el marco aísla el cambio de geometría del desplazamiento de página.
  await page.addStyleTag({
    content: "[data-hero3d] { position:fixed; top:0; left:0; }",
  });
  await page.waitForTimeout(100);
  const inicial = await canvas.screenshot();
  await page.evaluate(() => window.scrollTo(0, 220));
  await page.waitForTimeout(800);
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await comprobarReposo(page);
});

test("el movimiento reducido conserva drag y teclado sin hover ni inercia", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await abrir(page);
  const canvas = await esperarVisor(page);
  const inicial = await canvas.screenshot();
  await page.mouse.move(300, 180);
  await page.waitForTimeout(200);
  expect((await canvas.screenshot()).equals(inicial)).toBeTruthy();
  await page.mouse.down();
  await page.mouse.move(200, 180, { steps: 8 });
  await page.mouse.up();
  const manual = await canvas.screenshot();
  expect(manual.equals(inicial)).toBeFalsy();
  await page.waitForTimeout(250);
  expect((await canvas.screenshot()).equals(manual)).toBeTruthy();
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("Home");
  expect((await canvas.screenshot()).equals(inicial)).toBeTruthy();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await comprobarReposo(page);
});

test("la pausa global frena la inercia y conserva el control directo del teclado", async ({
  page,
}) => {
  await abrir(page);
  const canvas = await esperarVisor(page);
  await impulsar(page);
  await page.evaluate(
    () => (document.documentElement.dataset.motion = "paused"),
  );
  await page.waitForTimeout(100);
  const pausada = await canvas.screenshot();
  await page.waitForTimeout(250);
  expect((await canvas.screenshot()).equals(pausada)).toBeTruthy();
  await comprobarReposo(page);
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(pausada)).toBeFalsy();
  await page.evaluate(
    () => (document.documentElement.dataset.motion = "active"),
  );
  await page.waitForTimeout(900);
  await comprobarReposo(page);
});

test("deja de renderizar fuera de vista y no revive la inercia al regresar", async ({
  page,
}) => {
  await abrir(page);
  await esperarVisor(page);
  await impulsar(page);
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(200);
  await comprobarReposo(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(900);
  await comprobarReposo(page);
});

test("Inicio restablece también la inclinación del mouse cuando el movimiento está pausado", async ({
  page,
}) => {
  await abrir(page);
  const canvas = await esperarVisor(page);
  const inicial = await canvas.screenshot();
  await page.mouse.move(950, 120);
  await page.waitForTimeout(750);
  await page.evaluate(
    () => (document.documentElement.dataset.motion = "paused"),
  );
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("Home");
  expect((await canvas.screenshot()).equals(inicial)).toBeTruthy();
});

test("se carga automáticamente sin robar el foco, incluso con ahorro de datos", async ({
  page,
}) => {
  let liberar;
  const permiso = new Promise((resolve) => {
    liberar = resolve;
  });
  await abrir(page, { ahorro: true, demorar: permiso });
  const enlace = page.getByRole("link", { name: "Continuar leyendo" });
  await enlace.focus();
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "loading",
    { timeout: 5000 },
  );
  liberar();
  await esperarVisor(page);
  await expect(enlace).toBeFocused();
  await expect(page.getByRole("button")).toHaveCount(0);
});

test("espera a entrar en pantalla antes de descargar el motor o el modelo", async ({
  page,
}) => {
  const solicitudes = [];
  page.on("request", (request) => solicitudes.push(request.url()));
  await abrir(page, { fuera: true });
  await page.waitForTimeout(500);
  expect(
    solicitudes.some((url) => /modelo\.glb|hero3d-renderer\.js/.test(url)),
  ).toBeFalsy();
  await page.evaluate(() => window.scrollTo(0, 1000));
  await esperarVisor(page);
});

test("conserva la imagen al fallar y reintenta al recuperar la conexión sin un botón", async ({
  page,
}) => {
  await abrir(page, { fallo: true });
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
    { timeout: 20000 },
  );
  await expect(page.locator("[data-hero3d-error]")).toBeVisible();
  await expect(page.locator("[data-hero3d-canvas]")).toBeHidden();
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
  await page.context().unroute("**/modelo.glb?*");
  await page.context().route("**/modelo.glb?*", (route) =>
    route.fulfill({
      contentType: "model/gltf-binary",
      body: modeloDePrueba(),
    }),
  );
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await esperarVisor(page);
});

test("funciona como imagen sin WebGL y no atrapa el foco", async ({ page }) => {
  await abrir(page, { sinWebGL: true });
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
    { timeout: 20000 },
  );
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
  await expect(page.locator("[data-hero3d-canvas]")).toBeHidden();
  await expect(page.locator("[data-hero3d-canvas]")).toHaveAttribute(
    "tabindex",
    "-1",
  );
});

test("conserva el render y los gestos cuando el navegador necesita el motor principal", async ({
  page,
}) => {
  await abrir(page, { sinWorker: true });
  const canvas = await esperarVisor(page);
  await expect(page.locator("[data-hero3d-canvas]")).toHaveAttribute(
    "data-renderer",
    "main",
  );
  const inicial = await canvas.screenshot();
  await page.locator("[data-hero3d-canvas]").focus();
  await page.keyboard.press("ArrowRight");
  expect((await canvas.screenshot()).equals(inicial)).toBeFalsy();
  await comprobarReposo(page);
});

test("conserva la fotografía si no se pueden cargar las texturas del modelo", async ({
  page,
}) => {
  await abrir(page, { texturaFallida: true });
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
    { timeout: 20000 },
  );
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
});

test("la pérdida de WebGL devuelve la imagen y el foco a la figura sin controles", async ({
  page,
}) => {
  await abrir(page);
  const canvas = await esperarVisor(page);
  await page.locator("[data-hero3d-canvas]").focus();
  // El canvas transferido recibe la pérdida de contexto a través del puente.
  await canvas.dispatchEvent("webglcontextlost", { cancelable: true });
  await expect(page.locator("[data-hero3d]")).toHaveAttribute(
    "data-state",
    "error",
  );
  await expect(page.locator("[data-respaldo]")).toBeFocused();
  await expect(page.locator("[data-hero3d-poster]")).toHaveCSS("opacity", "1");
});

test("el arrastre táctil tiene inercia y el gesto vertical conserva el scroll nativo", async ({
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
  await abrir(page);
  const canvas = await esperarVisor(page);
  const inicial = await canvas.screenshot();
  const tacto = (type, x, y) =>
    cliente.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: type === "touchEnd" ? [] : [{ x, y }],
    });
  await tacto("touchStart", 300, 200);
  for (let x = 290; x >= 180; x -= 10) {
    await tacto("touchMove", x, 202);
    await page.waitForTimeout(16);
  }
  await tacto("touchEnd");
  const salida = await canvas.screenshot();
  expect(salida.equals(inicial)).toBeFalsy();
  await page.waitForTimeout(150);
  expect((await canvas.screenshot()).equals(salida)).toBeFalsy();
  await page.waitForTimeout(1200);
  await tacto("touchStart", 200, 320);
  for (let y = 310; y >= 140; y -= 10) await tacto("touchMove", 202, y);
  await tacto("touchEnd");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(100);
  await cliente.detach();
});
