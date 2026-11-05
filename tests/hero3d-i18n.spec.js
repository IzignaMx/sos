const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");

// La carga, los estados y las instrucciones de teclado para lectores de pantalla
// deben seguir siendo comprensibles al cambiar de idioma.
test("todos los idiomas incluyen instrucciones y estados accesibles del visor 3D", () => {
  const directorio = path.resolve(__dirname, "../i18n");
  const archivos = fs
    .readdirSync(directorio)
    .filter((archivo) => archivo.endsWith(".json"));
  const claves = ["loading", "error", "label", "keyboard", "ready"];
  expect(archivos).toHaveLength(20);
  for (const archivo of archivos) {
    const catalogo = JSON.parse(
      fs.readFileSync(path.join(directorio, archivo), "utf8"),
    );
    for (const clave of claves) {
      expect(catalogo.hero3d?.[clave], `${archivo}: hero3d.${clave}`).toEqual(
        expect.any(String),
      );
      expect(
        catalogo.hero3d?.[clave].trim().length,
        `${archivo}: hero3d.${clave}`,
      ).toBeGreaterThan(2);
    }
  }
});
