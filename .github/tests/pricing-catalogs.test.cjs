const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const directorio = path.resolve(__dirname, "../../i18n");
const catalogos = fs
  .readdirSync(directorio)
  .filter((nombre) => nombre.endsWith(".json"))
  .map((nombre) => [
    nombre.slice(0, -5),
    JSON.parse(fs.readFileSync(path.join(directorio, nombre), "utf8")),
  ]);
const preciosEspanoles = {
  performance: "Desde $1,200 MXN",
  wordpress: "Desde $1,500 MXN",
  audit: "Desde $1,200 MXN",
  checkout: "Desde $1,800 MXN",
};

test("los catálogos conservan MXN sólo en español y un respaldo USD en los demás idiomas", () => {
  assert.equal(catalogos.length, 20);
  for (const [idioma, catalogo] of catalogos) {
    for (const [servicio, precio] of Object.entries(preciosEspanoles)) {
      const valor = catalogo.services.cards[servicio].price;
      if (idioma === "es") assert.equal(valor, precio);
      else {
        assert.match(valor, /USD/, `${idioma}: ${servicio}`);
        assert.match(valor, /≈/, `${idioma}: debe indicar aproximación`);
        assert.doesNotMatch(valor, /MXN|₹|₩|¥/, `${idioma}: moneda incorrecta`);
      }
    }
    assert.equal(
      catalogo.pricing?.from?.split("{{amount}}").length,
      2,
      `${idioma}: plantilla de precio completa`,
    );
    assert.match(catalogo.pricing.note, /USD/, `${idioma}: nota de cotización`);
  }
});

test("ningún idioma compromete una entrega o explicación en video", () => {
  // Incluye los términos utilizados por los veinte catálogos publicados.
  const video =
    /video|vídeo|vidéo|videa|videan|pellicul|filmie|filmu|відео|видео|视频|動画|영상|वीडियो|فيديو/iu;
  for (const [idioma, catalogo] of catalogos) {
    assert.doesNotMatch(
      JSON.stringify(catalogo),
      video,
      `${idioma}: promesa de formato que ya no se ofrece`,
    );
    assert.ok(catalogo.impact.sectionDescription.length > 30);
    assert.ok(catalogo.ctaFinal.body.length > 30);
  }
});
