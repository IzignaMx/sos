/* Conversión orientativa en el navegador; los importes base siguen en MXN. */
(() => {
  const precios = Array.from(document.querySelectorAll("[data-price-mxn]"));
  if (!precios.length) return;

  const nota = document.querySelector("[data-pricing-note]");
  const proveedor = "https://api.frankfurter.dev/v2/rates?base=MXN&quotes=USD";
  const clave = "sos-usd-rate-v1";
  const dia = 86400000;
  // Última referencia verificada: Frankfurter v2, 5 de noviembre de 2026.
  const respaldo = 0.053738;
  let idioma = document.documentElement.lang || "es";
  let catalogo = null;
  let pendiente = null;
  let ultimoIntento = -Infinity;

  const esEspanol = () => idioma.toLowerCase().split("-")[0] === "es";
  const tasaVigente = (dato, instante) => {
    if (
      !dato ||
      typeof dato.rate !== "number" ||
      !Number.isFinite(dato.rate) ||
      dato.rate < 0.02 ||
      dato.rate > 0.15 ||
      typeof dato.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dato.date)
    )
      return false;
    const fecha = Date.parse(dato.date + "T00:00:00.000Z");
    return (
      Number.isFinite(fecha) &&
      new Date(fecha).toISOString().slice(0, 10) === dato.date &&
      fecha <= instante + dia &&
      instante - fecha <= 7 * dia
    );
  };
  const registroValido = (dato, instante = Date.now()) =>
    tasaVigente(dato, instante) &&
    Number.isFinite(dato.fetchedAt) &&
    dato.fetchedAt >= 0 &&
    dato.fetchedAt <= instante;
  const leerCache = () => {
    try {
      const dato = JSON.parse(localStorage.getItem(clave));
      return registroValido(dato) ? dato : null;
    } catch {
      return null;
    }
  };
  let referencia = leerCache();

  const pintar = () => {
    const espanol = esEspanol();
    if (nota) nota.hidden = espanol;
    // main.js ya ha aplicado el catálogo español, incluidos sus precios exactos.
    if (!espanol) {
      const tasa = registroValido(referencia) ? referencia.rate : respaldo;
      const plantilla = catalogo?.pricing?.from || "From ≈{{amount}}";
      const opciones = {
        style: "currency",
        currency: "USD",
        currencyDisplay: "code",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
      let formato;
      try {
        formato = new Intl.NumberFormat(idioma, opciones);
      } catch {
        formato = new Intl.NumberFormat("en", opciones);
      }
      precios.forEach((precio) => {
        const base = Number(precio.dataset.priceMxn);
        if (!Number.isFinite(base) || base <= 0) return;
        precio.textContent = plantilla.replace(
          "{{amount}}",
          formato.format(base * tasa),
        );
      });
    }
    document.dispatchEvent(new CustomEvent("sos:priceschange"));
  };

  const actualizarTasa = () => {
    const instante = Date.now();
    if (
      esEspanol() ||
      pendiente ||
      (registroValido(referencia, instante) &&
        instante - referencia.fetchedAt < dia) ||
      instante - ultimoIntento < 60000
    )
      return;
    ultimoIntento = instante;
    const controlador = new AbortController();
    const limite = setTimeout(() => controlador.abort(), 3000);
    // Una sola consulta compartida, incluso al cambiar de idioma rápidamente.
    pendiente = Promise.resolve()
      .then(() =>
        fetch(proveedor, {
          signal: controlador.signal,
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
        }),
      )
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("Tipo de cambio no disponible");
        return respuesta.json();
      })
      .then((datos) => {
        if (!Array.isArray(datos) || datos.length !== 1) return;
        const dato = datos[0];
        const recibido = Date.now();
        if (
          dato?.base !== "MXN" ||
          dato?.quote !== "USD" ||
          !tasaVigente(dato, recibido)
        )
          return;
        referencia = {
          rate: dato.rate,
          date: dato.date,
          fetchedAt: recibido,
        };
        try {
          localStorage.setItem(clave, JSON.stringify(referencia));
        } catch {
          // La conversión sigue funcionando cuando el almacenamiento está bloqueado.
        }
        // Se consulta el idioma vigente; la respuesta no puede restaurar uno anterior.
        if (!esEspanol()) pintar();
      })
      .catch(() => {
        // Sin red se conserva la referencia reciente o la aproximación incluida.
      })
      .finally(() => {
        clearTimeout(limite);
        pendiente = null;
      });
  };

  document.addEventListener("sos:languagechange", (evento) => {
    idioma = evento.detail?.language || document.documentElement.lang || "es";
    catalogo = evento.detail?.catalog || null;
    pintar();
    actualizarTasa();
  });
  if (!esEspanol()) {
    pintar();
    actualizarTasa();
  }
})();
