import * as Engine from './modules/engine.js';
import * as UI from './modules/ui.js';
import * as Physics from './modules/physics.js';

let jugador;
Engine.start = function() {
    UI.text("Hola Mundo", 10, 10);
    Physics.enableGravity(true);
};
Engine.update = function(deltaTime) {
};
