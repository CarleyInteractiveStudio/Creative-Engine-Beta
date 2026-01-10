// --- Módulo del Núcleo del Motor (creative.engine.core) ---

console.log("Módulo 'core.js' cargado.");

export const Scene = {
  load: (sceneName) => {
    console.log(`CORE: Cargando escena '${sceneName}'...`);
  }
};

export const Camera = {
  setPosition: (x, y, z) => {
    console.log(`CORE: Posición de la cámara establecida en (${x}, ${y}, ${z}).`);
  }
};

export const Assets = {
  loadModel: (name, path) => {
    console.log(`CORE: Creando materia '${name}' desde el archivo '${path}'.`);
    // En un motor real, esto devolvería un objeto de juego.
    // Devolvemos un objeto simulado para que el código del usuario no falle.
    return {
      name: name,
      x: 0,
      y: 0,
      z: 0,
      rotation: 0,
      scale: 1
    };
  }
};
