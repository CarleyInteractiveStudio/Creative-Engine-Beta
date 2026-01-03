// launcher.js
// Este script se encarga de cargar la configuración del proyecto,
// los módulos del motor y el script del juego del usuario (`game.js`),
// y luego inicia el motor.

console.log("Lanzador iniciado...");

async function main() {
    try {
        // 1. Cargar la configuración del proyecto
        console.log("Cargando project.json...");
        const configResponse = await fetch('project.json');
        if (!configResponse.ok) {
            throw new Error(`No se pudo cargar project.json: ${configResponse.statusText}`);
        }
        const config = await configResponse.json();
        console.log("Configuración cargada:", config.general.gameName);

        // 2. Cargar el script del juego del usuario
        // El transpiler convierte el código .ces a game.js.
        // Al importarlo, su código se ejecuta y define Engine.start y Engine.update.
        console.log("Cargando script del juego (game.js)...");
        // Usamos una ruta relativa. Asumimos que launcher.html y game.js están en la misma carpeta.
        await import('./game.js');
        console.log("Script del juego cargado y ejecutado.");

        // 3. Cargar el módulo principal del motor
        // Hacemos esto al final para asegurarnos de que el script del juego ya ha
        // modificado las funciones `start` y `update` que el motor exporta.
        console.log("Cargando el motor (engine.js)...");
        const Engine = await import('./modules/engine.js');
        console.log("Motor cargado.");

        // 4. Iniciar el motor con la configuración
        console.log("Iniciando Creative Engine...");
        Engine.run(config);

    } catch (error) {
        console.error("Error en el proceso de lanzamiento:", error);
        document.body.innerHTML = `<p style="color: #ff4d4d; font-family: monospace; font-size: 16px; padding: 20px;">
            <b>Error al lanzar el juego:</b><br>${error.message}<br><br>
            Asegúrate de que los archivos 'project.json' y 'game.js' existen en el mismo directorio que este lanzador.
        </p>`;
    }
}

main();
