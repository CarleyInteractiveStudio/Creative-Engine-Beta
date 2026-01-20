/**
 * game.js
 *
 * Punto de entrada principal para un juego publicado con Creative Engine.
 * Se encarga de mostrar la splash screen, cargar el motor y la escena
 * principal, y luego iniciar el bucle del juego.
 */

// Se asumirá que creative-engine-runtime.js ya ha sido cargado
// y ha expuesto el objeto 'Engine' globalmente.

async function main() {
    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error("No se encontró el elemento canvas con id 'game-canvas'.");
        return;
    }
    const ctx = canvas.getContext('2d');

    // --- 1. Splash Screen ---
    function showSplashScreen() {
        return new Promise(async (resolve) => {
            const logo = new Image();
            // La ruta es relativa al index.html del juego publicado
            logo.src = 'Assets/image/Creative_Engine_beta.png';

            let opacity = 0;
            let fadingIn = true;
            let fadingOut = false;
            let startTime = null;

            function animate(time) {
                if (!startTime) startTime = time;
                const elapsed = time - startTime;

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#1a1a1a'; // Un fondo oscuro
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                if (logo.complete) {
                    // Calcular posición para centrar el logo
                    const scale = Math.min(canvas.width * 0.5 / logo.width, canvas.height * 0.5 / logo.height);
                    const w = logo.width * scale;
                    const h = logo.height * scale;
                    const x = (canvas.width - w) / 2;
                    const y = (canvas.height - h) / 2;

                    ctx.globalAlpha = opacity;
                    ctx.drawImage(logo, x, y, w, h);
                }

                if (fadingIn) {
                    opacity = Math.min(1, elapsed / 1500); // 1.5s para aparecer
                    if (opacity >= 1) {
                        fadingIn = false;
                        // Pausa de 1 segundo con el logo visible
                        setTimeout(() => {
                            fadingOut = true;
                            startTime = performance.now(); // Reiniciar tiempo para el fade-out
                        }, 1000);
                    }
                } else if (fadingOut) {
                    opacity = Math.max(0, 1 - (elapsed / 1000)); // 1s para desaparecer
                    if (opacity <= 0) {
                        ctx.globalAlpha = 1;
                        resolve();
                        return; // Termina la animación
                    }
                }
                requestAnimationFrame(animate);
            }

            logo.onload = () => requestAnimationFrame(animate);
            logo.onerror = () => resolve(); // Si el logo no carga, simplemente continuar
        });
    }

    await showSplashScreen();

    // --- 2. Inicialización del Juego ---
    const { Engine, SceneManager } = window.CreativeEngine;

    Engine.initialize(canvas);

    // Cargar la escena principal (asumimos que está en scene.json)
    const sceneResponse = await fetch('scene.json');
    const sceneData = await sceneResponse.json();
    SceneManager.deserializeScene(sceneData);

    // Iniciar el bucle del juego
    Engine.startGameLoop();
}

// Iniciar todo el proceso
main();
