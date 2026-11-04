# Contrato de marca y recorrido por scroll

## Propósito

SOS debe reconocerse como una especialidad de IzignaMx. El recorrido explica tres acciones —detectar, reconectar y activar— mediante una forma que pasa de fragmentada a continua. Es una representación conceptual, no un conjunto de datos ni una promesa cuantitativa sobre conversión.

Se conserva la composición editorial propia de SOS y se recuperan los tokens públicos de IzignaMx: carbón, azul, cian, tipografía Aileron y el isotipo geométrico. La primera pantalla presenta la necesidad, una acción principal y una pieza original de Higgsfield. Los conceptos de escritorio y móvil se generan juntos para esta revisión, siguiendo la corrección de marca solicitada por el usuario.

## Escenas y responsabilidad visual

| Escena     | Progreso | Cambio visible                                                  | Significado                                 |
| ---------- | -------- | --------------------------------------------------------------- | ------------------------------------------- |
| Detectar   | 0–33 %   | Fragmentos separados y recorrido incompleto                     | Identificar obstáculos antes de intervenir  |
| Reconectar | 33–66 %  | Las piezas convergen, gira el conjunto y se dibuja el recorrido | Trabajar sobre la relación entre las partes |
| Activar    | 66–100 % | Forma continua y trayectoria completa                           | Entregar y comprobar el conjunto            |

Los porcentajes describen el recorrido de escritorio. En móvil, la etapa activa sigue al centro de texto más cercano al centro de la pantalla; cada miniatura evoluciona conforme entra su paso.

La pieza fotográfica de Higgsfield aporta materialidad en portada. El gráfico SVG del recorrido es original, editable y esquemático. No se presenta como un modelo 3D descargable. El desplazamiento y la continuidad expresan estados del proceso; no representan ventas, eventos de clientes ni magnitudes medidas.

Responsables: raíz para la composición y el SVG; agente de movimiento para el controlador y su revisión especializada; agente de conversión para el selector de necesidad y sus hipótesis. Cada capa tiene una función acotada. No se requiere simulación de datos porque no se codifica ningún dato ficticio.

## Implementación y límites

- Scroll nativo, sin captura de rueda, desplazamiento forzado ni autoplay.
- Composición lateral sticky en escritorio; en móvil, visual compacto sin sticky y pequeñas formas asociadas a cada paso que se ensamblan con su avance por el viewport. Así la gráfica nunca tapa los títulos.
- Un controlador agrupa eventos en un único RAF bajo demanda. Sólo escribe transformaciones, variables de trazo y estado; no mantiene un bucle en reposo.
- Desplazamiento reversible al subir, coherente tras resize y reanudación.
- Pausa manual, pestaña oculta y movimiento reducido detienen transformaciones. La alternativa muestra la forma final y todos los pasos, sin mantener una sección artificialmente larga.
- Contenido visible sin JavaScript; el selector sólo aparece cuando su comportamiento está disponible.
- CSS/SVG/JavaScript estáticos, sin framework, servidor, API o dependencia GPU. Compatibles con GitHub Pages y caché offline.

## Aceptación

Comprobar estados inicial, intermedio y final, inversión del scroll, scroll rápido, teclado, pausa, preferencia reducida, vuelta desde pestaña oculta, resize y 320px/390px/1440px. Capturas estáticas deben conservar títulos, estado conceptual y siguiente acción sin depender del movimiento. Preservar precios/plazos, accesibilidad de acciones, 20 idiomas y URLs versionadas coherentes.
