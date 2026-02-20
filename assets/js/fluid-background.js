(function () {
  "use strict";

  const noopController = {
    dispose() {},
  };

  const QUALITY_PRESETS = {
    alto: {
      id: "alto",
      particleDensity: 0.1,
      maxParticles: 100000,
      particleLifetime: 1000,
      numJacobiSteps: 3,
      numRenderSteps: 3,
      velocityScaleFactor: 8,
      maxVelocity: 30,
      trailLength: 18,
      touchForceScale: 2,
      frameBudget: 22,
    },
    medio: {
      id: "medio",
      particleDensity: 0.07,
      maxParticles: 70000,
      particleLifetime: 900,
      numJacobiSteps: 3,
      numRenderSteps: 2,
      velocityScaleFactor: 10,
      maxVelocity: 26,
      trailLength: 14,
      touchForceScale: 1.8,
      frameBudget: 28,
    },
    bajo: {
      id: "bajo",
      particleDensity: 0.045,
      maxParticles: 45000,
      particleLifetime: 800,
      numJacobiSteps: 2,
      numRenderSteps: 1,
      velocityScaleFactor: 12,
      maxVelocity: 22,
      trailLength: 12,
      touchForceScale: 1.5,
      frameBudget: 32,
    },
    minimo: {
      id: "minimo",
      particleDensity: 0.03,
      maxParticles: 25000,
      particleLifetime: 700,
      numJacobiSteps: 1,
      numRenderSteps: 1,
      velocityScaleFactor: 14,
      maxVelocity: 18,
      trailLength: 10,
      touchForceScale: 1.2,
      frameBudget: 36,
    },
  };

  const QUALITY_SEQUENCE = ["alto", "medio", "bajo", "minimo"];

  function getNextQualityId(id) {
    const index = QUALITY_SEQUENCE.indexOf(id);
    if (index === -1 || index >= QUALITY_SEQUENCE.length - 1) {
      return null;
    }
    return QUALITY_SEQUENCE[index + 1];
  }

  function prefersReducedMotion() {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false;
    }
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (error) {
      return false;
    }
  }

  function detectQualityProfile({ supportsWebGL2 }) {
    if (prefersReducedMotion()) {
      return "minimo";
    }
    const connection =
      typeof navigator !== "undefined"
        ? navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection
        : null;
    if (connection && connection.saveData) {
      return "bajo";
    }
    const deviceMemory =
      typeof navigator !== "undefined" && navigator.deviceMemory
        ? navigator.deviceMemory
        : 0;
    const cores =
      typeof navigator !== "undefined" && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 0;
    const pixelRatio =
      typeof window !== "undefined" && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;
    const screenWidth =
      typeof window !== "undefined" && window.innerWidth
        ? window.innerWidth
        : 0;
    const screenHeight =
      typeof window !== "undefined" && window.innerHeight
        ? window.innerHeight
        : 0;
    const screenArea = screenWidth * screenHeight;

    let score = 0;

    if (supportsWebGL2) {
      score += 1;
    } else {
      score -= 2;
    }

    if (deviceMemory >= 8) {
      score += 2;
    } else if (deviceMemory >= 4) {
      score += 1;
    } else if (deviceMemory > 0) {
      score -= 1;
    } else {
      score -= 1;
    }

    if (cores >= 8) {
      score += 2;
    } else if (cores >= 4) {
      score += 1;
    } else if (cores > 0) {
      score -= 1;
    } else {
      score -= 1;
    }

    if (pixelRatio > 2.5) {
      score -= 1;
    }

    if (screenArea > 2500000) {
      score -= 1;
    }

    if (deviceMemory && deviceMemory <= 2) {
      score -= 1;
    }

    if (score <= -1) {
      return "bajo";
    }
    if (score <= 1) {
      return "medio";
    }
    return "alto";
  }

  function setupMediaListener(query, handler, cleanup) {
    if (!query) {
      return;
    }
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", handler);
      cleanup.push(() => query.removeEventListener("change", handler));
    } else if (typeof query.addListener === "function") {
      query.addListener(handler);
      cleanup.push(() => query.removeListener(handler));
    }
  }

  function initFluidBackgroundInternal(options = {}) {
    if (!window.GPUIO || !window.GPUIO.GPUComposer) {
      console.warn("GPUIO no disponible para el fondo fluido");
      return null;
    }

    const {
      GPUComposer,
      GPUProgram,
      GPULayer,
      SHORT,
      INT,
      FLOAT,
      REPEAT,
      NEAREST,
      LINEAR,
      WEBGL2,
      WEBGL1,
      GLSL3,
      GLSL1,
      isWebGL2Supported,
    } = window.GPUIO;

    const canvas = document.createElement("canvas");
    canvas.className = "fondo--fluido";
    canvas.setAttribute("aria-hidden", "true");
    canvas.setAttribute("role", "presentation");

    if (!document.body) {
      return null;
    }
    document.body.insertBefore(canvas, document.body.firstChild);

    const { profileId, onRequestDowngrade } = options;
    const cleanupCallbacks = [];

    const supportsWebGL2 =
      typeof isWebGL2Supported === "function" ? isWebGL2Supported() : true;
    const selectedProfileId = QUALITY_PRESETS[profileId]
      ? profileId
      : detectQualityProfile({ supportsWebGL2 });
    const quality =
      QUALITY_PRESETS[selectedProfileId] || QUALITY_PRESETS.minimo;

    if (typeof console !== "undefined" && typeof console.info === "function") {
      console.info(
        'Fondo fluido: perfil de calidad "' + selectedProfileId + '"',
      );
    }

    const {
      touchForceScale: TOUCH_FORCE_SCALE,
      particleDensity: PARTICLE_DENSITY,
      maxParticles: MAX_NUM_PARTICLES,
      particleLifetime: PARTICLE_LIFETIME,
      numJacobiSteps: NUM_JACOBI_STEPS,
      numRenderSteps: NUM_RENDER_STEPS,
      velocityScaleFactor: VELOCITY_SCALE_FACTOR,
      maxVelocity: MAX_VELOCITY,
      trailLength: TRAIL_LENGTH,
      frameBudget: FRAME_BUDGET,
    } = quality;

    const PRESSURE_CALC_ALPHA = -1;
    const PRESSURE_CALC_BETA = 0.25;
    const POSITION_NUM_COMPONENTS = 4;

    let animationId = null;
    let composer;
    let velocityState;
    let divergenceState;
    let pressureState;
    let particlePositionState;
    let particleInitialState;
    let particleAgeState;
    let trailState;
    let advection;
    let divergence2D;
    let jacobi;
    let gradientSubtraction;
    let renderParticles;
    let ageParticles;
    let advectParticles;
    let fadeTrails;
    let renderTrails;
    let touch;
    let NUM_PARTICLES = 0;
    let canvasBounds = canvas.getBoundingClientRect();
    const activeTouches = new Map();

    const now = () =>
      typeof performance !== "undefined" &&
      typeof performance.now === "function"
        ? performance.now()
        : Date.now();
    const frameDurations = [];
    const FRAME_SAMPLE_SIZE = 45;
    let lastFrameTime = now();
    let degradeRequested = false;

    const calcNumParticles = (width, height) =>
      Math.min(Math.ceil(width * height * PARTICLE_DENSITY), MAX_NUM_PARTICLES);

    function requestDowngrade(targetProfileId) {
      if (degradeRequested) {
        return;
      }
      let fallbackProfile = targetProfileId;
      if (!fallbackProfile || fallbackProfile === selectedProfileId) {
        fallbackProfile = getNextQualityId(selectedProfileId);
      }
      if (!fallbackProfile || fallbackProfile === selectedProfileId) {
        return;
      }
      degradeRequested = true;
      if (typeof onRequestDowngrade === "function") {
        onRequestDowngrade(fallbackProfile);
      }
    }

    const reduceMotionQuery =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    setupMediaListener(
      reduceMotionQuery,
      (event) => {
        if (event.matches) {
          requestDowngrade("minimo");
        }
      },
      cleanupCallbacks,
    );
    if (
      reduceMotionQuery &&
      reduceMotionQuery.matches &&
      selectedProfileId !== "minimo"
    ) {
      requestDowngrade("minimo");
    }

    const connection =
      typeof navigator !== "undefined"
        ? navigator.connection ||
          navigator.mozConnection ||
          navigator.webkitConnection
        : null;
    const handleConnectionChange = () => {
      if (connection && connection.saveData) {
        requestDowngrade(selectedProfileId === "minimo" ? "minimo" : "bajo");
      }
    };
    if (connection) {
      handleConnectionChange();
      if (typeof connection.addEventListener === "function") {
        connection.addEventListener("change", handleConnectionChange);
        cleanupCallbacks.push(() =>
          connection.removeEventListener("change", handleConnectionChange),
        );
      }
    }

    function handleVisibilityChange() {
      lastFrameTime = now();
      frameDurations.length = 0;
    }
    if (typeof document !== "undefined" && document.addEventListener) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      cleanupCallbacks.push(() =>
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange,
        ),
      );
    }

    function dispose() {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      window.removeEventListener("resize", onResize);
      document.body.removeEventListener("pointerdown", onPointerStart);
      document.body.removeEventListener("pointermove", onPointerMove);
      document.body.removeEventListener("pointerup", onPointerStop);
      document.body.removeEventListener("pointercancel", onPointerStop);
      document.body.removeEventListener("pointerleave", onPointerStop);
      activeTouches.clear();
      cleanupCallbacks.forEach((fn) => fn());
      cleanupCallbacks.length = 0;
      if (trailState) trailState.dispose();
      if (particleAgeState) particleAgeState.dispose();
      if (particleInitialState) particleInitialState.dispose();
      if (particlePositionState) particlePositionState.dispose();
      if (pressureState) pressureState.dispose();
      if (divergenceState) divergenceState.dispose();
      if (velocityState) velocityState.dispose();
      if (renderTrails) renderTrails.dispose();
      if (fadeTrails) fadeTrails.dispose();
      if (advectParticles) advectParticles.dispose();
      if (ageParticles) ageParticles.dispose();
      if (renderParticles) renderParticles.dispose();
      if (gradientSubtraction) gradientSubtraction.dispose();
      if (jacobi) jacobi.dispose();
      if (divergence2D) divergence2D.dispose();
      if (advection) advection.dispose();
      if (touch) touch.dispose();
      if (composer) composer.dispose();
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }

    try {
      composer = new GPUComposer({
        canvas,
        contextID: supportsWebGL2 ? WEBGL2 : WEBGL1,
        glslVersion: supportsWebGL2 ? GLSL3 : GLSL1,
      });
    } catch (error) {
      console.warn("No se pudo iniciar GPUComposer", error);
      dispose();
      return null;
    }

    const baseWidth =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      canvas.clientWidth ||
      1;
    const baseHeight =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      canvas.clientHeight ||
      1;
    NUM_PARTICLES = calcNumParticles(baseWidth, baseHeight);

    try {
      velocityState = new GPULayer(composer, {
        name: "velocity",
        dimensions: [
          Math.ceil(baseWidth / VELOCITY_SCALE_FACTOR),
          Math.ceil(baseHeight / VELOCITY_SCALE_FACTOR),
        ],
        type: FLOAT,
        filter: LINEAR,
        numComponents: 2,
        wrapX: REPEAT,
        wrapY: REPEAT,
        numBuffers: 2,
      });
      divergenceState = new GPULayer(composer, {
        name: "divergence",
        dimensions: [velocityState.width, velocityState.height],
        type: FLOAT,
        filter: NEAREST,
        numComponents: 1,
        wrapX: REPEAT,
        wrapY: REPEAT,
      });
      pressureState = new GPULayer(composer, {
        name: "pressure",
        dimensions: [velocityState.width, velocityState.height],
        type: FLOAT,
        filter: NEAREST,
        numComponents: 1,
        wrapX: REPEAT,
        wrapY: REPEAT,
        numBuffers: 2,
      });
      particlePositionState = new GPULayer(composer, {
        name: "position",
        dimensions: NUM_PARTICLES,
        type: FLOAT,
        numComponents: POSITION_NUM_COMPONENTS,
        numBuffers: 2,
      });
      particleInitialState = new GPULayer(composer, {
        name: "initialPosition",
        dimensions: NUM_PARTICLES,
        type: FLOAT,
        numComponents: POSITION_NUM_COMPONENTS,
      });
      particleAgeState = new GPULayer(composer, {
        name: "age",
        dimensions: NUM_PARTICLES,
        type: SHORT,
        numComponents: 1,
        numBuffers: 2,
      });
      trailState = new GPULayer(composer, {
        name: "trails",
        dimensions: [baseWidth, baseHeight],
        type: FLOAT,
        filter: NEAREST,
        numComponents: 1,
        numBuffers: 2,
      });
    } catch (error) {
      console.warn("No se pudieron crear las capas GPU", error);
      dispose();
      return null;
    }

    try {
      advection = new GPUProgram(composer, {
        name: "advection",
        fragmentShader: `
        in vec2 v_uv;

        uniform sampler2D u_state;
        uniform sampler2D u_velocity;
        uniform vec2 u_dimensions;

        out vec2 out_state;

        void main() {
          out_state = texture(u_state, v_uv - texture(u_velocity, v_uv).xy / u_dimensions).xy;
        }`,
        uniforms: [
          { name: "u_state", value: 0, type: INT },
          { name: "u_velocity", value: 1, type: INT },
          { name: "u_dimensions", value: [baseWidth, baseHeight], type: FLOAT },
        ],
      });
      divergence2D = new GPUProgram(composer, {
        name: "divergence2D",
        fragmentShader: `
        in vec2 v_uv;

        uniform sampler2D u_vectorField;
        uniform vec2 u_pxSize;

        out float out_divergence;

        void main() {
          float n = texture(u_vectorField, v_uv + vec2(0.0, u_pxSize.y)).y;
          float s = texture(u_vectorField, v_uv - vec2(0.0, u_pxSize.y)).y;
          float e = texture(u_vectorField, v_uv + vec2(u_pxSize.x, 0.0)).x;
          float w = texture(u_vectorField, v_uv - vec2(u_pxSize.x, 0.0)).x;
          out_divergence = 0.5 * (e - w + n - s);
        }`,
        uniforms: [
          { name: "u_vectorField", value: 0, type: INT },
          {
            name: "u_pxSize",
            value: [1 / velocityState.width, 1 / velocityState.height],
            type: FLOAT,
          },
        ],
      });
      jacobi = new GPUProgram(composer, {
        name: "jacobi",
        fragmentShader: `
        in vec2 v_uv;

        uniform float u_alpha;
        uniform float u_beta;
        uniform vec2 u_pxSize;
        uniform sampler2D u_previousState;
        uniform sampler2D u_divergence;

        out vec4 out_jacobi;

        void main() {
          vec4 n = texture(u_previousState, v_uv + vec2(0.0, u_pxSize.y));
          vec4 s = texture(u_previousState, v_uv - vec2(0.0, u_pxSize.y));
          vec4 e = texture(u_previousState, v_uv + vec2(u_pxSize.x, 0.0));
          vec4 w = texture(u_previousState, v_uv - vec2(u_pxSize.x, 0.0));
          vec4 d = texture(u_divergence, v_uv);
          out_jacobi = (n + s + e + w + u_alpha * d) * u_beta;
        }`,
        uniforms: [
          { name: "u_alpha", value: PRESSURE_CALC_ALPHA, type: FLOAT },
          { name: "u_beta", value: PRESSURE_CALC_BETA, type: FLOAT },
          {
            name: "u_pxSize",
            value: [1 / velocityState.width, 1 / velocityState.height],
            type: FLOAT,
          },
          { name: "u_previousState", value: 0, type: INT },
          { name: "u_divergence", value: 1, type: INT },
        ],
      });
      gradientSubtraction = new GPUProgram(composer, {
        name: "gradientSubtraction",
        fragmentShader: `
        in vec2 v_uv;

        uniform vec2 u_pxSize;
        uniform sampler2D u_scalarField;
        uniform sampler2D u_vectorField;

        out vec2 out_result;

        void main() {
          float n = texture(u_scalarField, v_uv + vec2(0.0, u_pxSize.y)).r;
          float s = texture(u_scalarField, v_uv - vec2(0.0, u_pxSize.y)).r;
          float e = texture(u_scalarField, v_uv + vec2(u_pxSize.x, 0.0)).r;
          float w = texture(u_scalarField, v_uv - vec2(u_pxSize.x, 0.0)).r;
          out_result = texture(u_vectorField, v_uv).xy - 0.5 * vec2(e - w, n - s);
        }`,
        uniforms: [
          {
            name: "u_pxSize",
            value: [1 / velocityState.width, 1 / velocityState.height],
            type: FLOAT,
          },
          { name: "u_scalarField", value: 0, type: INT },
          { name: "u_vectorField", value: 1, type: INT },
        ],
      });
      renderParticles = new GPUProgram(composer, {
        name: "renderParticles",
        fragmentShader: `
        #define VIDA_MAX ${PARTICLE_LIFETIME.toFixed(1)}
        in vec2 v_uv;
        in vec2 v_uv_position;

        uniform isampler2D u_ages;
        uniform sampler2D u_velocity;

        out float out_state;

        void main() {
          float edad = float(texture(u_ages, v_uv_position).x) / VIDA_MAX;
          float opacidad = mix(0.0, 1.0, min(edad * 10.0, 1.0)) * mix(1.0, 0.0, max(edad * 10.0 - 9.0, 0.0));
          vec2 velocidad = texture(u_velocity, v_uv).xy;
          float energia = clamp(dot(velocidad, velocidad) * 0.04 + 0.7, 0.0, 1.0);
          out_state = opacidad * energia;
        }`,
        uniforms: [
          { name: "u_ages", value: 0, type: INT },
          { name: "u_velocity", value: 1, type: INT },
        ],
      });
      ageParticles = new GPUProgram(composer, {
        name: "ageParticles",
        fragmentShader: `
        in vec2 v_uv;

        uniform isampler2D u_ages;

        out int out_age;

        void main() {
          int edad = texture(u_ages, v_uv).x + 1;
          out_age = stepi(edad, ${PARTICLE_LIFETIME}) * edad;
        }`,
        uniforms: [{ name: "u_ages", value: 0, type: INT }],
      });
      advectParticles = new GPUProgram(composer, {
        name: "advectParticles",
        fragmentShader: `
        in vec2 v_uv;

        uniform vec2 u_dimensions;
        uniform sampler2D u_positions;
        uniform sampler2D u_velocity;
        uniform isampler2D u_ages;
        uniform sampler2D u_initialPositions;

        out vec4 out_position;

        void main() {
          vec4 positionData = texture(u_positions, v_uv);
          vec2 absolute = positionData.rg;
          vec2 displacement = positionData.ba;
          vec2 position = absolute + displacement;

          vec2 pxSize = 1.0 / u_dimensions;
          vec2 velocity1 = texture(u_velocity, position * pxSize).xy;
          vec2 halfStep = position + velocity1 * 0.5 * ${1 / NUM_RENDER_STEPS};
          vec2 velocity2 = texture(u_velocity, halfStep * pxSize).xy;
          displacement += velocity2 * ${1 / NUM_RENDER_STEPS};

          float shouldMerge = step(20.0, dot(displacement, displacement));
          absolute = mod(absolute + shouldMerge * displacement + u_dimensions, u_dimensions);
          displacement *= (1.0 - shouldMerge);

          int shouldReset = stepi(texture(u_ages, v_uv).x, 1);
          out_position = mix(vec4(absolute, displacement), texture(u_initialPositions, v_uv), float(shouldReset));
        }`,
        uniforms: [
          { name: "u_positions", value: 0, type: INT },
          { name: "u_velocity", value: 1, type: INT },
          { name: "u_ages", value: 2, type: INT },
          { name: "u_initialPositions", value: 3, type: INT },
          { name: "u_dimensions", value: [baseWidth, baseHeight], type: FLOAT },
        ],
      });
      fadeTrails = new GPUProgram(composer, {
        name: "fadeTrails",
        fragmentShader: `
        in vec2 v_uv;

        uniform sampler2D u_image;
        uniform float u_increment;

        out float out_color;

        void main() {
          out_color = max(texture(u_image, v_uv).x + u_increment, 0.0);
        }`,
        uniforms: [
          { name: "u_image", value: 0, type: INT },
          { name: "u_increment", value: -1 / TRAIL_LENGTH, type: FLOAT },
        ],
      });
      renderTrails = new GPUProgram(composer, {
        name: "renderTrails",
        fragmentShader: `
        in vec2 v_uv;
        uniform sampler2D u_trailState;
        out vec4 out_color;
        void main() {
          vec3 fondo = vec3(0.007, 0.059, 0.143);
          vec3 acento = vec3(0.18, 0.63, 0.86);
          float intensidad = texture(u_trailState, v_uv).x;
          out_color = vec4(mix(fondo, acento, intensidad), 1.0);
        }`,
        uniforms: [{ name: "u_trailState", value: 0, type: INT }],
      });
      touch = new GPUProgram(composer, {
        name: "touch",
        fragmentShader: `
        in vec2 v_uv;
        in vec2 v_uv_local;

        uniform sampler2D u_velocity;
        uniform vec2 u_vector;

        out vec2 out_velocity;

        void main() {
          vec2 radial = v_uv_local * 2.0 - 1.0;
          float radiusSq = dot(radial, radial);
          vec2 velocidad = texture(u_velocity, v_uv).xy + (1.0 - radiusSq) * u_vector * ${TOUCH_FORCE_SCALE.toFixed(
            1,
          )};
          float magnitud = length(velocidad);
          out_velocity = velocidad / magnitud * min(magnitud, ${MAX_VELOCITY.toFixed(
            1,
          )});
        }`,
        uniforms: [
          { name: "u_velocity", value: 0, type: INT },
          { name: "u_vector", value: [0, 0], type: FLOAT },
        ],
      });
    } catch (error) {
      console.warn("No se pudieron compilar los programas GPU", error);
      dispose();
      return null;
    }

    function stepSimulation() {
      composer.step({
        program: advection,
        input: [velocityState, velocityState],
        output: velocityState,
      });
      composer.step({
        program: divergence2D,
        input: velocityState,
        output: divergenceState,
      });
      for (let i = 0; i < NUM_JACOBI_STEPS; i += 1) {
        composer.step({
          program: jacobi,
          input: [pressureState, divergenceState],
          output: pressureState,
        });
      }
      composer.step({
        program: gradientSubtraction,
        input: [pressureState, velocityState],
        output: velocityState,
      });
      composer.step({
        program: ageParticles,
        input: particleAgeState,
        output: particleAgeState,
      });
      composer.step({
        program: fadeTrails,
        input: trailState,
        output: trailState,
      });
      for (let i = 0; i < NUM_RENDER_STEPS; i += 1) {
        composer.step({
          program: advectParticles,
          input: [
            particlePositionState,
            velocityState,
            particleAgeState,
            particleInitialState,
          ],
          output: particlePositionState,
        });
        composer.drawLayerAsPoints({
          layer: particlePositionState,
          program: renderParticles,
          input: [particleAgeState, velocityState],
          output: trailState,
          wrapX: true,
          wrapY: true,
        });
      }
      composer.step({ program: renderTrails, input: trailState });
    }

    function monitorFrameTime() {
      if (!FRAME_BUDGET) {
        return;
      }
      if (typeof document !== "undefined" && document.hidden) {
        frameDurations.length = 0;
        lastFrameTime = now();
        return;
      }
      const currentTime = now();
      const delta = currentTime - lastFrameTime;
      lastFrameTime = currentTime;
      if (!Number.isFinite(delta) || delta <= 0) {
        return;
      }
      if (frameDurations.length >= FRAME_SAMPLE_SIZE) {
        frameDurations.shift();
      }
      frameDurations.push(delta);
      if (!degradeRequested && frameDurations.length === FRAME_SAMPLE_SIZE) {
        let total = 0;

        for (let i = 0; i < frameDurations.length; i += 1) {
          total += frameDurations[i];
        }
        const average = total / frameDurations.length;
        if (average > FRAME_BUDGET) {
          requestDowngrade();
        }
      }
    }

    function tick() {
      composer.tick();
      stepSimulation();
      monitorFrameTime();
      animationId = window.requestAnimationFrame(tick);
    }

    function toCanvasCoords(event) {
      return [
        event.clientX - canvasBounds.left,
        event.clientY - canvasBounds.top,
      ];
    }

    function onPointerStart(event) {
      const coords = toCanvasCoords(event);
      activeTouches.set(event.pointerId, { current: coords });
    }

    function onPointerMove(event) {
      if (!activeTouches.has(event.pointerId)) {
        onPointerStart(event);
        return;
      }
      const stored = activeTouches.get(event.pointerId);
      stored.last = stored.current;
      stored.current = toCanvasCoords(event);
      const { current, last } = stored;
      if (!last || (current[0] === last[0] && current[1] === last[1])) {
        return;
      }
      touch.setUniform("u_vector", [
        current[0] - last[0],
        -(current[1] - last[1]),
      ]);
      composer.stepSegment({
        program: touch,
        input: velocityState,
        output: velocityState,
        position1: [current[0], canvasBounds.height - current[1]],
        position2: [last[0], canvasBounds.height - last[1]],
        thickness: 30,
        endCaps: true,
      });
    }

    function onPointerStop(event) {
      activeTouches.delete(event.pointerId);
    }

    function onResize() {
      const widthResize =
        window.innerWidth || document.documentElement.clientWidth || 1;
      const heightResize =
        window.innerHeight || document.documentElement.clientHeight || 1;
      frameDurations.length = 0;
      lastFrameTime = now();
      canvasBounds = canvas.getBoundingClientRect();

      composer.resize([widthResize, heightResize]);
      const velocityDimensions = [
        Math.ceil(widthResize / VELOCITY_SCALE_FACTOR),
        Math.ceil(heightResize / VELOCITY_SCALE_FACTOR),
      ];
      velocityState.resize(velocityDimensions);
      divergenceState.resize(velocityDimensions);
      pressureState.resize(velocityDimensions);
      trailState.resize([widthResize, heightResize]);

      advection.setUniform("u_dimensions", [widthResize, heightResize]);
      advectParticles.setUniform("u_dimensions", [widthResize, heightResize]);
      const velocityPxSize = [
        1 / velocityDimensions[0],
        1 / velocityDimensions[1],
      ];
      divergence2D.setUniform("u_pxSize", velocityPxSize);
      jacobi.setUniform("u_pxSize", velocityPxSize);
      gradientSubtraction.setUniform("u_pxSize", velocityPxSize);

      NUM_PARTICLES = calcNumParticles(widthResize, heightResize);
      const positions = new Float32Array(
        NUM_PARTICLES * POSITION_NUM_COMPONENTS,
      );
      for (let i = 0; i < NUM_PARTICLES; i += 1) {
        positions[i * POSITION_NUM_COMPONENTS] = Math.random() * widthResize;
        positions[i * POSITION_NUM_COMPONENTS + 1] =
          Math.random() * heightResize;
        positions[i * POSITION_NUM_COMPONENTS + 2] = 0;
        positions[i * POSITION_NUM_COMPONENTS + 3] = 0;
      }
      particlePositionState.resize(NUM_PARTICLES, positions);
      particleInitialState.resize(NUM_PARTICLES, positions);

      const ages = new Int16Array(NUM_PARTICLES);
      for (let i = 0; i < NUM_PARTICLES; i += 1) {
        ages[i] = Math.round(Math.random() * PARTICLE_LIFETIME);
      }
      particleAgeState.resize(NUM_PARTICLES, ages);
    }

    window.addEventListener("resize", onResize);
    document.body.addEventListener("pointerdown", onPointerStart, {
      passive: true,
    });
    document.body.addEventListener("pointermove", onPointerMove, {
      passive: true,
    });
    document.body.addEventListener("pointerup", onPointerStop, {
      passive: true,
    });
    document.body.addEventListener("pointercancel", onPointerStop, {
      passive: true,
    });
    document.body.addEventListener("pointerleave", onPointerStop, {
      passive: true,
    });

    onResize();
    animationId = window.requestAnimationFrame(tick);

    return {
      dispose,
    };
  }

  window.initFluidBackground = function initFluidBackground() {
    if (!window.GPUIO || !window.GPUIO.GPUComposer) {
      console.warn("GPUIO no disponible para iniciar el fondo fluido");
      return noopController;
    }

    const supportsWebGL2 =
      typeof window.GPUIO.isWebGL2Supported === "function"
        ? window.GPUIO.isWebGL2Supported()
        : true;
    let currentProfileId = detectQualityProfile({ supportsWebGL2 });
    let currentController = noopController;
    let disposed = false;

    function selectFallbackProfile(requestedProfile) {
      const currentIndex = QUALITY_SEQUENCE.indexOf(currentProfileId);
      if (requestedProfile && QUALITY_PRESETS[requestedProfile]) {
        const requestedIndex = QUALITY_SEQUENCE.indexOf(requestedProfile);
        if (requestedIndex !== -1 && requestedIndex > currentIndex) {
          return requestedProfile;
        }
      }
      return getNextQualityId(currentProfileId);
    }

    function rebuild(profileId) {
      if (disposed) {
        return;
      }
      if (
        currentController &&
        typeof currentController.dispose === "function"
      ) {
        currentController.dispose();
      }
      currentProfileId = QUALITY_PRESETS[profileId] ? profileId : "minimo";
      const nextController = initFluidBackgroundInternal({
        profileId: currentProfileId,
        onRequestDowngrade(requestedProfile) {
          if (disposed) {
            return;
          }
          const fallbackProfile = selectFallbackProfile(requestedProfile);
          if (fallbackProfile && fallbackProfile !== currentProfileId) {
            rebuild(fallbackProfile);
          }
        },
      });
      currentController = nextController || noopController;
    }

    rebuild(currentProfileId);

    return {
      dispose() {
        disposed = true;
        if (
          currentController &&
          typeof currentController.dispose === "function"
        ) {
          currentController.dispose();
        }
      },
    };
  };
})();
