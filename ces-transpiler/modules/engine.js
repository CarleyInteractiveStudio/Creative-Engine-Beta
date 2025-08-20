// --- Módulo Base del Motor (creative.engine) ---

console.log("Módulo 'engine.js' cargado.");

// El bucle principal del juego llamaría a estas funciones.
export let start = () => {
  console.log("Engine.start() no implementado por el usuario.");
};

export let update = (deltaTime) => {
  // Se llamaría en cada frame
};

// Objeto global simulado para la entrada del usuario
export const Input = {
  keyDown: (key) => {
    // console.log(`Input: Comprobando si la tecla '${key}' está presionada.`);
    return false;
  }
};

// Función para iniciar el motor (ahora acepta la configuración)
export function run(config = {}) {
  console.log("========================================");
  console.log("Creative Engine iniciado con la siguiente configuración:");

  // Simulación de aplicación de ajustes
  console.log(`- Icono del juego: ${config.general?.icon || 'default.ico'}`);
  console.log(`- Splash Screen: ${config.general?.splashScreen || 'default.png'}`);
  if (config.graphics?.shadows) {
      console.log("- Sistema de Sombras: ACTIVADO");
  } else {
      console.log("- Sistema de Sombras: DESACTIVADO");
  }
  if (config.security?.antiTampering) {
      console.log("- Protección Anti-Manipulación: ACTIVADA");
  }
  console.log("========================================");

  // Llama a la función de inicio del usuario una vez.
  start();

  // Simula el bucle de juego (game loop)
  console.log("Iniciando bucle de juego simulado (3 frames)...");
  let frame = 0;
  const gameLoop = setInterval(() => {
    if (frame >= 3) {
      clearInterval(gameLoop);
      console.log("Bucle de juego simulado finalizado.");
      return;
    }
    frame++;
    const deltaTime = 1 / 60; // Delta de tiempo simulado
    console.log(`--- Frame ${frame} ---`);
    update(deltaTime);
  }, 500);
}
