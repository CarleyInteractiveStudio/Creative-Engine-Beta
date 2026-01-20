import { CEEngine } from './js/engine/CEEngine.js';

function showSplashScreen(callback) {
    const splash = document.createElement('div');
    Object.assign(splash.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: '#1a1a1a', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: '9999', transition: 'opacity 0.5s ease',
    });
    splash.innerHTML = '<h1 style="color: white; font-family: sans-serif;">Creative Engine</h1>';
    document.body.appendChild(splash);

    setTimeout(() => {
        splash.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(splash);
            callback();
        }, 500);
    }, 1500);
}

showSplashScreen(() => {
    const engine = new CEEngine('game-canvas');
    engine.loadAndRunScene('__START_SCENE_PATH__');
});
