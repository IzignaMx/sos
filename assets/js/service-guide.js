/* Orientación local y reversible: el catálogo conserva precios y alcance. */
(() => {
  const guia = document.querySelector("[data-service-guide]");
  if (!guia) return;

  const opciones = Array.from(guia.querySelectorAll("[data-service-choice]"));
  const restablecer = guia.querySelector("[data-service-reset]");
  const resultado = guia.querySelector("[data-service-result]");
  const enlace = guia.querySelector("[data-recommended-link]");
  const campos = [
    ["[data-recommended-title]", ".service-card__title"],
    ["[data-recommended-summary]", ".service-card__summary"],
    ["[data-recommended-price]", ".service-card__price"],
    ["[data-recommended-duration]", ".badge-time"],
  ].map(([destino, origen]) => ({
    destino: guia.querySelector(destino),
    origen,
  }));
  const tarjetas = new Map(
    Array.from(document.querySelectorAll("[data-service-id]"))
      .filter((tarjeta) => tarjeta.id)
      .map((tarjeta) => [tarjeta.dataset.serviceId, tarjeta]),
  );
  if (
    !opciones.length ||
    !restablecer ||
    !resultado ||
    !enlace ||
    campos.some((campo) => !campo.destino) ||
    opciones.some((opcion) => !tarjetas.has(opcion.dataset.serviceChoice))
  )
    return;

  let seleccion = null;

  const actualizar = () => {
    opciones.forEach((opcion) => {
      opcion.setAttribute(
        "aria-pressed",
        String(opcion.dataset.serviceChoice === seleccion),
      );
    });
    tarjetas.forEach((tarjeta, id) => {
      if (id === seleccion) tarjeta.dataset.recommended = "true";
      else delete tarjeta.dataset.recommended;
    });

    const tarjeta = tarjetas.get(seleccion);
    if (!tarjeta) {
      resultado.hidden = true;
      campos.forEach(({ destino }) => {
        destino.textContent = "";
      });
      enlace.removeAttribute("href");
      return;
    }

    campos.forEach(({ destino, origen }) => {
      destino.textContent =
        tarjeta.querySelector(origen)?.textContent.trim() || "";
    });
    enlace.setAttribute("href", "#" + encodeURIComponent(tarjeta.id));
    resultado.hidden = false;
  };

  opciones.forEach((opcion) => {
    opcion.addEventListener("click", () => {
      seleccion = opcion.dataset.serviceChoice;
      actualizar();
    });
  });
  restablecer.addEventListener("click", () => {
    seleccion = null;
    actualizar();
  });
  // La traducción del catálogo se completa antes de anunciar este evento.
  document.addEventListener("sos:languagechange", actualizar);
  // La cotización puede llegar después de traducir las tarjetas.
  document.addEventListener("sos:priceschange", actualizar);

  actualizar();
  guia.hidden = false;
})();
