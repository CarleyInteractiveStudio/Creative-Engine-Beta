// --- Módulo de Física (creative.engine.physics) ---

console.log("Módulo 'physics.js' cargado.");

export const Physics = {
  enableGravity: (is_enabled) => {
    console.log(`PHYSICS: La gravedad global se ha ${is_enabled ? 'activado' : 'desactivado'}.`);
  },
  addBody: (gameObject) => {
    console.log(`PHYSICS: Añadiendo cuerpo físico al objeto '${gameObject.name}'.`);
  },
  setGravity: (vector) => {
    console.log(`PHYSICS: Estableciendo la gravedad global en (${vector.x}, ${vector.y}, ${vector.z}).`);
  }
};
