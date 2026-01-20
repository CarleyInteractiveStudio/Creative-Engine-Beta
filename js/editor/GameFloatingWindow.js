/**
 * GameFloatingWindow.js
 *
 * Este módulo gestiona la funcionalidad para abrir una ventana de juego externa
 * e independiente del editor principal.
 */

let menuItemId = 'menu-window-external-game';

/**
 * Abre una nueva ventana del navegador que carga el juego.
 */
function openGameWindow() {
    const projectName = new URLSearchParams(window.location.search).get('project');
    if (!projectName) {
        console.error("No se puede abrir la ventana de juego porque no se ha seleccionado ningún proyecto.");
        // Idealmente, aquí se mostraría una notificación al usuario.
        return;
    }

    // Construye la URL para el modo "solo juego"
    // Se puede añadir un parámetro específico como ?mode=game si se implementa esa lógica
    const gameUrl = `editor.html?project=${projectName}&mode=game`;

    // Abrir la ventana
    window.open(gameUrl, `CreativeEngine_Game_${projectName}`, 'width=960,height=540,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no');
}


/**
 * Inicializa el módulo, añadiendo la opción al menú principal.
 */
export function initialize() {
    const windowMenu = document.getElementById('window-menu-content');
    if (!windowMenu) {
        console.error("No se encontró el menú 'Ventana' para añadir la opción de juego externo.");
        return;
    }

    // Añadir un separador si no existe
    if (!windowMenu.querySelector('hr')) {
         const separator = document.createElement('hr');
         windowMenu.appendChild(separator);
    }

    // Crear y añadir el nuevo elemento de menú
    const menuItem = document.createElement('a');
    menuItem.id = menuItemId;
    menuItem.href = '#';
    menuItem.textContent = 'Ventana de Juego Externa';

    menuItem.addEventListener('click', (e) => {
        e.preventDefault();
        openGameWindow();
    });

    windowMenu.appendChild(menuItem);
    console.log("Módulo GameFloatingWindow inicializado.");
}
