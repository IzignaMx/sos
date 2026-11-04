/* Demostración conceptual de jerarquía: mejora progresiva del control nativo. */
(() => {
  const control = document.querySelector("#clarity");
  const stage = document.querySelector("[data-lab]");
  const controls = document.querySelector("[data-lab-controls]");
  const output = document.querySelector("[data-lab-value]");
  if (!control || !stage || !controls || !output) return;
  const update = () => {
    const value = Math.max(0, Math.min(100, Number(control.value)));
    stage.style.setProperty("--clarity", value / 100);
    stage.dataset.clarity = value < 50 ? "low" : "high";
    output.value = value + "%";
  };
  controls.hidden = false;
  control.addEventListener("input", update);
  update();
})();
