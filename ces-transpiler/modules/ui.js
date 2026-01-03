// --- Módulo de Interfaz de Usuario (creative.engine.ui) ---

console.log("Módulo 'ui.js' cargado.");

export const UI = {
  text: (message, x, y) => {
    console.log(`UI: Mostrando texto '${message}' en la posición (${x}, ${y}).`);
  },
  button: (label, x, y, onClick) => {
    console.log(`UI: Creando botón con etiqueta '${label}' en la posición (${x}, ${y}).`);
  }
};
