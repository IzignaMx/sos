# Estrategia de claridad, confianza y elección para SOS

Consulta de fuentes: 4 de noviembre de 2026. Este documento propone criterios de diseño para una landing estática alojada en GitHub Pages. No declara resultados comerciales obtenidos ni una validación neurocientífica de SOS.

## Qué significa «neuromarketing» en esta entrega

Aplicamos principios de atención, reconocimiento y reducción de incertidumbre estudiados en UX. La intención es facilitar una decisión informada y mantener la identidad reconocible de IzignaMx. No se atribuyen efectos universales a un color, no se prometen incrementos de conversión y no se presentan animaciones como prueba de resultados reales.

La investigación sobre checkout de comercio electrónico aporta criterios de transparencia, pero no permite trasladar directamente sus porcentajes a una página de servicios. Cada aplicación siguiente es una hipótesis que debe comprobarse con personas y, cuando exista volumen suficiente, con datos de negocio.

## Cinco estrategias aplicables

| Estrategia                                        | Evidencia y límite                                                                                                                                                             | Aplicación en SOS                                                                                                                                                                                                       | Hipótesis comprobable                                                                                                                                     |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Familiaridad de marca con jerarquía consistente   | NNGroup explica cómo escala, color, espacio y tratamiento coherente organizan la lectura y refuerzan la percepción de marca. No implica que una paleta concreta convierta más. | Mantener logo, colores y señales visuales verificadas de IzignaMx; diferenciar SOS mediante composición, ritmo y el motivo de reparación. Reservar el acento principal para acciones y estados relevantes.              | Una persona que conoce IzignaMx reconoce SOS como parte de la marca y distingue su oferta en una primera lectura.                                         |
| Reconocimiento antes que recuerdo                 | NNGroup recomienda hacer visibles las opciones y su contexto; reconocer una necesidad exige menos recuperación de memoria que interpretar nombres técnicos aislados.           | Ofrecer cuatro necesidades expresadas en lenguaje cotidiano y vincularlas a los servicios existentes. Mantener a la vista el catálogo completo.                                                                         | Más personas identifican el servicio adecuado sin tener que explicar términos como hardening o Core Web Vitals.                                           |
| Información esencial antes del compromiso         | Baymard observa que conocer el costo y las condiciones relevantes permite decidir antes de comenzar un proceso. Su evidencia corresponde a compras, no a leads de servicios.   | Mostrar juntos precio inicial, plazo y alcance junto al CTA. Explicar que el enlace abre WhatsApp y permite confirmar alcance y disponibilidad; no simular una reserva instantánea.                                     | Se reduce la incertidumbre sobre qué ocurre al pulsar el CTA y qué incluye el importe «desde».                                                            |
| Atención progresiva y movimiento con significado  | NNGroup recomienda reducir carga extrínseca y diferir detalle secundario sin ocultar información necesaria. Una animación no debe competir con la decisión.                    | Usar el scroll para explicar tres estados de una misma pieza: fricción, reparación y continuidad. Mantener títulos, precio y CTA legibles; ofrecer pausa y estado estático. Los detalles extensos pueden seguir en FAQ. | La persona puede describir el proceso de SOS aun con animaciones desactivadas y encuentra el contacto sin completar el recorrido.                         |
| Confianza verificable y siguiente paso predecible | La estética puede mejorar la percepción de usabilidad, pero también ocultar problemas durante una evaluación. No reemplaza evidencia ni claridad funcional.                    | Identificar a IzignaMx, conservar contacto directo y políticas, explicar el método, separar prototipos conceptuales de trabajos reales y usar únicamente cifras/testimonios sustentables.                               | La persona entiende quién presta el servicio, qué se entregará y cómo se acordará el trabajo; el diseño sigue funcionando al quitar sus efectos visuales. |

No se añaden contadores de disponibilidad sin inventario real, cupos ficticios, temporizadores reiniciables, descuentos de referencia inventados, selecciones ocultas ni mensajes que culpabilicen a quien no desea contratar. La prioridad es correspondencia entre apariencia, contenido y funcionamiento.

## Selector de necesidad propuesto

Pregunta: **«¿Qué necesita tu tienda hoy?»**

La selección es opcional, local y reversible. No solicita nombre, correo, URL de tienda ni otra información personal. La recomendación es una regla editorial explícita; no es un diagnóstico automatizado ni una predicción del resultado de negocio.

| Opción visible                 | Servicio existente                 | Motivo de la sugerencia                                                                  | Precio y plazo existentes  |
| ------------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------- |
| Mi tienda va lenta             | Velocidad + diseño (`performance`) | Revisa velocidad, conflictos entre apps y fricción de interfaz en Shopify / BigCommerce. | Desde $1,200 MXN · 24–48 h |
| Mi WordPress necesita limpieza | Seguridad + limpieza (`wordpress`) | Revisa seguridad, plugins y la página clave de WordPress.                                | Desde $1,500 MXN · 48–72 h |
| Pierdo compras en el checkout  | Checkout sin fricción (`checkout`) | Revisa puntos de abandono, textos, validaciones y estados de carga.                      | Desde $1,800 MXN · 48–72 h |
| No sé por dónde empezar        | Auditoría Flash 360° (`audit`)     | Ordena hallazgos y propone prioridades antes de elegir intervenciones.                   | Desde $1,200 MXN · 48 h    |

### Contrato de interacción

1. Estado inicial: ninguna necesidad está elegida. El catálogo y sus precios permanecen disponibles; el control no impide explorar o contactar directamente.
2. Una selección muestra la sugerencia y su motivo, además del precio inicial y plazo ya publicados. La misma información no debe mantenerse duplicada manualmente en otra fuente que pueda quedar desactualizada.
3. La recomendación se anuncia de forma breve para lectores de pantalla y conserva el foco en el control elegido. No abre WhatsApp, cambia de página ni desplaza la pantalla automáticamente.
4. «Ver alcance» lleva al servicio correspondiente mediante un enlace interno. «Hablar por WhatsApp» utiliza el enlace de contacto existente y deja claro que abre ese canal. Elegir una necesidad no envía mensajes.
5. Se puede cambiar la selección o volver a ver todo. Las otras alternativas siguen accesibles; la sugerencia no se presenta como «la mejor» ni «la más popular» sin evidencia.
6. Sin JavaScript se muestra el catálogo completo con enlaces internos y de contacto. Con movimiento reducido, el cambio de estado es inmediato. En teclado y pantalla pequeña se conserva la misma función.

La interfaz puede resolverse con HTML semántico y JavaScript mínimo en el cliente. Un grupo nativo de opciones o botones con estado accesible es suficiente. No necesita una API, cookies, cuentas, almacenamiento personal ni un servidor distinto de GitHub Pages.

### Microcopy a considerar

- Cerca de la acción principal: **«Hablemos por WhatsApp. Confirmamos alcance y plazo antes de empezar.»**
- Cerca del selector: **«Una orientación para empezar. Puedes explorar todos los servicios.»**
- Estado de recomendación: **«Por lo que elegiste, este servicio puede encajar.»**

Estos textos deben contrastarse con la operación real. Si la disponibilidad no se confirma automáticamente, «Consultar disponibilidad» expresa mejor la acción que un botón que parezca garantizar una reserva en 24 horas.

## Cómo evaluar sin inventar resultados

Primero comprobar comprensión con tareas breves: identificar que SOS pertenece a IzignaMx, elegir un servicio para un problema descrito, encontrar el precio inicial y plazo, explicar qué ocurrirá al pulsar el CTA, y completar esas tareas con teclado y movimiento reducido. Registrar errores, dudas, ruta tomada y tiempo hasta encontrar una opción pertinente. Las respuestas favorables sobre estética no sustituyen observar el comportamiento.

Como hipótesis de negocio, comparar una versión con selector frente al catálogo directo manteniendo constantes la oferta y los precios. Separar apertura de WhatsApp de conversación cualificada y contratación: un clic no acredita una conversión comercial. No concluir causalidad a partir de visitas pequeñas ni comparar periodos sin considerar campañas y procedencia del tráfico.

Si se instrumenta la analítica ya existente, registrar sólo eventos acotados —por ejemplo selección de categoría, consulta de alcance y clic de contacto— bajo la configuración de privacidad aplicable. No enviar texto libre, URL de tienda, identificadores de personas ni datos escritos en WhatsApp. No se necesita ni se propone instalar seguimiento adicional para que la interacción funcione.

## Fuentes primarias consultadas

- NNGroup, Raluca Budiu: [Memory Recognition and Recall in User Interfaces](https://www.nngroup.com/articles/recognition-and-recall/). Fundamenta opciones visibles y con contexto.
- NNGroup, Kathryn Whitenton: [Minimize Cognitive Load to Maximize Usability](https://www.nngroup.com/articles/minimize-cognitive-load/). Distingue información útil de complejidad visual innecesaria.
- NNGroup, Jakob Nielsen: [Progressive Disclosure](https://www.nngroup.com/articles/progressive-disclosure/). Recomienda mantener lo frecuente y necesario en primer nivel, y revelar detalle secundario bajo demanda.
- NNGroup, Kelley Gordon: [5 Principles of Visual Design in UX](https://www.nngroup.com/articles/principles-visual-design/). Explica jerarquía, escala, contraste y percepción de marca.
- NNGroup, Kate Moran: [The Aesthetic–Usability Effect](https://www.nngroup.com/articles/aesthetic-usability-effect/). Explica tanto el valor perceptivo de la estética como su capacidad para ocultar problemas en investigación.
- Baymard, Christian Holst: [Product Pages Need to Show Estimated Shipping Costs](https://baymard.com/research-articles/show-shipping-costs-on-product-pages). Evidencia sobre transparencia temprana de costos; aquí se aplica como criterio de reducción de incertidumbre, sin extrapolar sus porcentajes a SOS.
