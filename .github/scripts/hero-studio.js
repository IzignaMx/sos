/* Estudio de producto: paneles difusos, cobalto profundo y reflejos continuos. */
import {
  Color,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
} from "three";

export function crearEstudio() {
  const estudio = new Scene();
  estudio.background = new Color().setRGB(0.085, 0.09, 0.1);

  const panel = (posicion, medida, intensidad, color = [1, 1, 1]) => {
    const material = new ShaderMaterial({
      uniforms: {
        potencia: { value: intensidad },
        tinte: { value: new Color().setRGB(...color) },
      },
      side: DoubleSide,
      vertexShader: `
        varying vec2 vPanel;
        void main() {
          vPanel = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float potencia;
        uniform vec3 tinte;
        varying vec2 vPanel;
        void main() {
          vec2 borde = abs(vPanel * 2.0 - 1.0);
          float suave = exp(-3.0 * dot(borde, borde))
            * (1.0 - smoothstep(0.85, 1.0, max(borde.x, borde.y)));
          gl_FragColor = vec4(vec3(0.085, 0.09, 0.1) + tinte * potencia * suave, 1.0);
        }
      `,
    });
    const foco = new Mesh(new PlaneGeometry(...medida), material);
    foco.position.set(...posicion);
    foco.lookAt(0, 0, 0);
    estudio.add(foco);
  };

  panel([-3.8, 2.5, 3.5], [3.5, 6.5], 5);
  panel([4.5, 1.2, 1.5], [2.4, 5.5], 2.4, [0.88, 0.94, 1]);
  panel([0, 5.5, 0], [4, 3], 2);
  panel([-0.5, 1.3, -4.5], [2.5, 5], 3.2);
  panel([0, -2.5, 4.5], [5, 2.8], 0.8);
  estudio.dispose = () =>
    estudio.traverse((objeto) => {
      objeto.geometry?.dispose();
      objeto.material?.dispose();
    });
  return estudio;
}
