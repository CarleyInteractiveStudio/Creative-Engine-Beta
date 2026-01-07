// --- Módulo de Animación (creative.engine.animator) ---

console.log("Módulo 'animator.js' cargado.");

export const Animator = {
  play: (animationName) => {
    console.log(`ANIMATOR: Reproduciendo animación '${animationName}'.`);
  },
  stop: (animationName) => {
    console.log(`ANIMATOR: Deteniendo animación '${animationName}'.`);
  }
};
