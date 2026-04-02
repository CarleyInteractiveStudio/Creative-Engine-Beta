/**
 * Database of valid Creative Engine scripts for Auto Reparator.
 * Contains 500+ examples covering various mechanics in Spanish.
 */
export const examples = [
    // --- 1. MOVIMIENTO (MOVEMENT) ---
    {
        title: "Movimiento Top-Down Simple",
        code: `ve motor;
publico numero velocidad = 5;
alActualizar(delta) {
    si (teclaPresionada("w")) posicion.y -= velocidad;
    si (teclaPresionada("s")) posicion.y += velocidad;
    si (teclaPresionada("a")) posicion.x -= velocidad;
    si (teclaPresionada("d")) posicion.x += velocidad;
}`
    },
    {
        title: "Plataformero Básico",
        code: `ve motor;
publico numero velocidad = 300;
publico numero fuerzaSalto = 15;
alActualizar(delta) {
    variable horizontal = 0;
    si (teclaPresionada("d")) horizontal = 1;
    si (teclaPresionada("a")) horizontal = -1;
    fisica.velocity.x = horizontal * (velocidad * delta);
    si (horizontal != 0) {
        voltearH = (horizontal < 0);
        reproducir.Caminar();
    } sino {
        reproducir.Idle();
    }
    si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
        fisica.applyImpulse(nuevo Vector2(0, -fuerzaSalto));
    }
}`
    },
    {
        title: "Rotación hacia el Mouse",
        code: `ve motor;
alActualizar(delta) {
    variable mouse = obtenerPosicionMouse();
    variable dx = mouse.x - posicion.x;
    variable dy = mouse.y - posicion.y;
    posicion.rotation = Redondear(Redondear(dy, dx) * 180 / 3.14);
}`
    },
    {
        title: "Dash con cooldown",
        code: `ve motor;
publico numero fuerzaDash = 20;
variable puedeDash = verdadero;
alActualizar(delta) {
    si (teclaRecienPresionada("Shift") && puedeDash) {
        puedeDash = falso;
        fisica.applyImpulse(nuevo Vector2(fuerzaDash, 0));
        esperar(1);
        puedeDash = verdadero;
    }
}`
    },
    {
        title: "Seguir a un objetivo",
        code: `ve motor;
publico mtr objetivo;
publico numero suavidad = 0.1;
alActualizar(delta) {
    si (objetivo) {
        posicion.x += (objetivo.posicion.x - posicion.x) * suavidad;
        posicion.y += (objetivo.posicion.y - posicion.y) * suavidad;
    }
}`
    },
    {
        title: "Movimiento de Tanque",
        code: `ve motor;
publico numero velGiro = 180;
publico numero velAvance = 200;
alActualizar(delta) {
    si (teclaPresionada("a")) rotacion -= velGiro * delta;
    si (teclaPresionada("d")) rotacion += velGiro * delta;
    si (teclaPresionada("w")) {
        variable rad = rotacion * 3.14 / 180;
        posicion.x += coseno(rad) * velAvance * delta;
        posicion.y += seno(rad) * velAvance * delta;
    }
}`
    },
    {
        title: "Patrulla Simple",
        code: `ve motor;
publico numero distancia = 200;
variable inicioX = 0;
variable dir = 1;
alEmpezar() { inicioX = posicion.x; }
alActualizar(delta) {
    posicion.x += dir * 100 * delta;
    si (absoluto(posicion.x - inicioX) > distancia) dir *= -1;
}`
    }
];

// --- SMART SEMANTIC RULES (Small Rule-Based Brain) ---

export const intentWeights = {
    movimiento: {
        keywords: ['tecla', 'velocidad', 'vel', 'posicion', 'moverse', 'caminar', 'x', 'y', 'w', 'a', 's', 'd', 'arriba', 'abajo', 'izquierda', 'derecha', 'mover', 'correr', 'dash', 'salto', 'voltear'],
        requiredComponents: ['Transform'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 10
    },
    fisica: {
        keywords: ['fisica', 'gravedad', 'impulso', 'fuerza', 'velocity', 'salto', 'choque', 'colision', 'rb', 'masa', 'rebotar', 'friccion', 'torque', 'angular', 'empujar'],
        requiredComponents: ['Rigidbody2D'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 15
    },
    salud: {
        keywords: ['vida', 'daño', 'curar', 'morir', 'muerte', 'salud', 'health', 'damage', 'heal', 'danar', 'reproducir', 'vidaMaxima', 'revivir'],
        requiredComponents: ['Health'],
        preferredLifecycle: 'alEntrarEnColision',
        scoreBoost: 12
    },
    ui: {
        keywords: ['boton', 'click', 'barra', 'texto', 'imagen', 'ui', 'progreso', 'valor', 'pantalla', 'clicar', 'pulsar', 'dialogo', 'menu', 'hover', 'canvas'],
        requiredComponents: ['UIImage', 'UIText', 'ProgressBar'],
        preferredLifecycle: 'alHacerClick',
        scoreBoost: 10
    },
    combate: {
        keywords: ['atacar', 'bala', 'proyectil', 'disparar', 'fire', 'espada', 'golpe', 'enemigo', 'dañar', 'dañar', 'vida', 'rango', 'distancia', 'objetivo'],
        requiredComponents: ['Attack'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 12
    },
    vfx: {
        keywords: ['particula', 'sistemaDeParticulas', 'explosion', 'vfx', 'emision', 'play', 'stop', 'color', 'brillo', 'fuego', 'humo'],
        requiredComponents: ['ParticleSystem'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 8
    },
    camara: {
        keywords: ['camara', 'camera', 'follow', 'seguimiento', 'shake', 'zoom', 'vista', 'objetivo'],
        requiredComponents: ['Camera', 'CameraFollow'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 9
    }
};

export const structuralRules = {
    mandatoryHeader: "ve motor;",
    allowedGlobalScope: ['publico', 'variable', 'constante', 've', 'go', 'engine', 'motor'],
    lifecycleMethods: [
        'alEmpezar', 'alActualizar', 'alEntrarEnColision', 'alHacerClick',
        'alRecibir', 'alFinalizarAnimacion', 'alChocar', 'alClicar', 'alPulsar'
    ]
};

export const typeInference = [
    { regex: /velocidad|fuerza|salto|vida|danio|daño|distancia|masa|gravedad|valor|puntos|cantidad|rango|tiempo|duracion|alpha|opacidad|escala|rotacion/i, type: 'numero' },
    { regex: /nombre|tag|texto|mensaje|nivel|escena|id|ruta|clase/i, type: 'texto' },
    { regex: /activo|puede|esta|es|tocado|listo|abierta|bloqueado|pausado/i, type: 'booleano' },
    { regex: /objetivo|meta|jugador|padre|hijo|materia|mtr|target/i, type: 'mtr' },
    { regex: /prefab|bala|enemigo|item|recompensa|proyectil/i, type: 'Prefab' },
    { regex: /sonido|audio|musica|efecto|clip/i, type: 'Audio' },
    { regex: /icono|imagen|sprite|textura|fondo/i, type: 'Sprite' }
];

/**
 * Logic Patterns (Step-by-step logic sequences)
 * Defines what logically follows a certain action or event.
 */
export const logicPatterns = [
    {
        name: "Input to Movement",
        trigger: /teclaPresionada|teclaRecienPresionada/i,
        elements: ["posicion", "velocidad", "delta"],
        completion: "posicion.x += velocidad * delta;"
    },
    {
        name: "Collision to Health",
        trigger: /alEntrarEnColision|alChocar/i,
        elements: ["tieneTag", "vida", "danio|daño"],
        completion: "si (otro.tieneTag('Enemigo')) { vida -= 10; }"
    },
    {
        name: "Timer Loop",
        trigger: /alEmpezar/i,
        elements: ["cada", "esperar"],
        completion: "cada(1) { /* logica aqui */ }"
    },
    {
        name: "UI Button Click",
        trigger: /alHacerClick|alClicar/i,
        elements: ["imprimir", "cargarEscena", "destruir"],
        completion: "imprimir('Botón pulsado');"
    },
    {
        name: "Prefab Instantiation",
        trigger: /teclaRecienPresionada|alActualizar/i,
        elements: ["instanciar|crear", "Vector2", "posicion"],
        completion: "instanciar(proyectil, posicion.x, posicion.y);"
    },
    {
        name: "Health Decay and Death",
        trigger: /vida\s*-=|dañar/i,
        elements: ["si", "0", "destruir|muerte"],
        completion: "si (vida <= 0) {\n    reproducir.Muerte();\n    destruir(materia);\n}"
    },
    {
        name: "Advanced Movement",
        trigger: /velocidad|moverse/i,
        elements: ["rotacion", "coseno", "seno", "fisica"],
        completion: "variable rad = rotacion * 3.14 / 180;\nfisica.velocity.x = coseno(rad) * velocidad;\nfisica.velocity.y = seno(rad) * velocidad;"
    },
    {
        name: "Interaction System",
        trigger: /lanzarRayo|raycast/i,
        elements: ["mtr", "distancia", "tieneTag"],
        completion: "variable hit = lanzarRayo(posicion, nuevo Vector2(1,0), 100);\nsi (hit && hit.tieneTag('Interactivo')) {\n    difundir('interactuar', hit);\n}"
    },
    {
        name: "State Toggle",
        trigger: /teclaRecienPresionada/i,
        elements: ["booleano", "!", "activo"],
        completion: "variable activa = !activa;\nrenderizadorDeSprite.isActive = activa;"
    },
    {
        name: "Automatic Flip",
        trigger: /velocidad|x\s*\+=|x\s*-=/i,
        elements: ["voltearH", "horizontal"],
        completion: "si (velocidadX > 0) voltearH = falso;\nsi (velocidadX < 0) voltearH = verdadero;"
    },
    {
        name: "Audio Feedback",
        trigger: /alHacerClick|alPresionar|teclaRecienPresionada/i,
        elements: ["reproducir", "audio|sonido"],
        completion: "reproducir.Accion();"
    },
    {
        name: "UI sync",
        trigger: /vida|puntos|progreso/i,
        elements: ["valor", "uiBarra|uiTexto"],
        completion: "uiBarra.valor = vidaActual;\nuiTexto.contenido = 'Vida: ' + vidaActual;"
    },
    {
        name: "Particle burst",
        trigger: /colision|destruir|golpe/i,
        elements: ["particula", "play|stop"],
        completion: "sistemaDeParticulas.play();\nesperar(0.5);\nsistemaDeParticulas.stop();"
    }
];

/**
 * Full Logic Blocks for prediction.
 * Can be inserted as a whole functional unit.
 */
export const blockTemplates = [
    {
        name: "Mecánica: Salto Completo",
        keywords: ["salto", "saltar", "suelo"],
        code: `si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {
    fisica.applyImpulse(nuevo Vector2(0, -10));
    reproducir.Salto();
}`
    },
    {
        name: "Mecánica: Disparo Proyectil",
        keywords: ["disparar", "fuego", "bala"],
        code: `si (teclaRecienPresionada("f")) {
    variable bala = instanciar(proyectil, posicion.x, posicion.y);
    bala.fisica.velocity.x = voltearH ? -20 : 20;
    reproducir.Disparo();
}`
    },
    {
        name: "Mecánica: Perseguir Jugador",
        keywords: ["perseguir", "ia", "seguir"],
        code: `si (jugador && distancia(posicion, jugador.posicion) < 400) {
    variable dir = jugador.x > x ? 1 : -1;
    posicion.x += dir * velocidad * delta;
    voltearH = (dir < 0);
}`
    }
];

/**
 * Performance Mentor rules.
 * Identifies expensive calls and suggests optimizations.
 */
export const expensivePatterns = [
    {
        pattern: /buscar\s*\(/i,
        location: "alActualizar",
        message: "⚠️ Ineficiencia detectada: 'buscar()' en alActualizar. Es mejor buscarlo una vez en alEmpezar() y guardarlo en una variable.",
        fix: "variable objRef;"
    },
    {
        pattern: /instanciar\s*\(/i,
        location: "alActualizar",
        message: "⚠️ ¡Cuidado! Instanciar objetos cada frame puede causar lentitud. Asegúrate de que esté dentro de una condición 'si'.",
        fix: null
    }
];

// High Quality Templates for mass generation
const templates = [
    { name: "Salud y Daño", code: "ve motor;\npublico numero vida = 100;\nalEntrarEnColision(otro) {\n    si (otro.tieneTag(\"Enemigo\")) {\n        vida -= 10;\n        si (vida <= 0) destruir(materia);\n    }\n}" },
    { name: "Disparo Proyectil", code: "ve motor;\npublico Prefab bala;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"f\")) {\n        instanciar(bala, posicion.x, posicion.y);\n    }\n}" },
    { name: "Cambio de Color al Click", code: "ve motor;\nalHacerClick() {\n    renderizadorDeSprite.color = \"#ff0000\";\n}" },
    { name: "Timer de Destrucción", code: "ve motor;\nalEmpezar() {\n    esperar(3);\n    destruir(materia);\n}" },
    { name: "Loop de Escala", code: "ve motor;\nalActualizar(delta) {\n    escala.x = 1 + seno(tiempoDelta * 2) * 0.2;\n    escala.y = 1 + seno(tiempoDelta * 2) * 0.2;\n}" },
    { name: "Detección por Raycast", code: "ve motor;\nalActualizar(delta) {\n    variable hit = lanzarRayo(posicion, nuevo Vector2(1,0), 100, \"Pared\");\n    si (hit) imprimir(\"Pared detectada\");\n}" },
    { name: "UI: Actualizar Barra", code: "ve motor;\npublico mtr barra;\nalActualizar(delta) {\n    si (barra) {\n        barra.uiBarra.valor = vidaActual;\n    }\n}" },
    { name: "Rotación Continua", code: "ve motor;\npublico numero velRot = 90;\nalActualizar(delta) {\n    posicion.rotation += velRot * delta;\n}" },
    { name: "Teletransporte", code: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"t\")) {\n        posicion.x = azar(0, 800);\n        posicion.y = azar(0, 600);\n    }\n}" },
    { name: "Gravedad Personalizada", code: "ve motor;\nalActualizar(delta) {\n    fisica.addForce(0, 9.8);\n}" },
    { name: "IA de Persecución", code: "ve motor;\npublico mtr jugador;\nalActualizar(delta) {\n    si (jugador && distancia(posicion, jugador.posicion) < 500) {\n        variable dir = nuevo Vector2(jugador.x - x, jugador.y - y);\n        fisica.velocity = dir;\n    }\n}" },
    { name: "Recolección de Item", code: "ve motor;\nalEntrarEnColision(otro) {\n    si (otro.tieneTag(\"Player\")) {\n        difundir(\"item_recogido\", { tipo: \"oro\", cantidad: 10 });\n        destruir(materia);\n    }\n}" },
    { name: "Puerta con Llave", code: "ve motor;\npublico booleano abierta = falso;\nalRecibir(\"llave_obtenida\", () => abierta = verdadero);\nalHacerClick() {\n    si (abierta) destruir(materia);\n}" },
    { name: "Efecto de Temblor", code: "ve motor;\nalActualizar(delta) {\n    posicion.x += azar(-2, 2);\n    posicion.y += azar(-2, 2);\n}" },
    { name: "Plataforma Móvil", code: "ve motor;\npublico numero rango = 100;\nvariable t = 0;\nalActualizar(delta) {\n    t += delta;\n    posicion.y += seno(t) * rango * delta;\n}" },
    { name: "Cambio de Escena", code: "ve motor;\npublico texto nivel = \"Nivel2\";\nalEntrarEnColision(otro) {\n    si (otro.tieneTag(\"Player\")) cargarEscena(nivel);\n}" },
    { name: "Habilidad: Escudo", code: "ve motor;\nvariable escudoActivo = falso;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"e\")) {\n        escudoActivo = verdadero;\n        renderizadorDeSprite.opacity = 0.5;\n        esperar(2);\n        escudoActivo = falso;\n        renderizadorDeSprite.opacity = 1.0;\n    }\n}" },
    { name: "Vibración UI", code: "ve motor;\nalHacerClick() {\n    cada(0.05) {\n        posicionUI.x += azar(-5, 5);\n    }\n}" },
    { name: "IA: Patrulla con Espera", code: "ve motor;\nalActualizar(delta) {\n    mover(100 * delta, 0);\n    si (x > 500) {\n        esperar(2);\n        x = 0;\n    }\n}" },
    { name: "Control de Animación", code: "ve motor;\nalActualizar(delta) {\n    si (teclaPresionada(\"w\")) reproducir.Caminar();\n    sino reproducir.Parado();\n}" },
    { name: "Jefe: Fase 1", code: "ve motor;\npublico numero vida = 500;\nalActualizar(delta) {\n    si (vida > 250) {\n        rotacion += 100 * delta;\n        cada(1) { instanciar(proyectil, x, y); }\n    }\n}" },
    { name: "Inventario: Añadir", code: "ve motor;\nalRecibir(\"item_suelo\", (data) => {\n    imprimir(\"Recogido: \" + data.nombre);\n    destruir(materia);\n});" },
    { name: "Efecto: Parpadeo", code: "ve motor;\ncada(0.5) {\n    renderizadorDeSprite.isActive = !renderizadorDeSprite.isActive;\n}" },
    { name: "Gravedad: Flotación", code: "ve motor;\nalActualizar(delta) {\n    fisica.addForce(0, -9.8 * 0.5);\n}" },
    { name: "Control: Salto Doble", code: "ve motor;\nvariable saltos = 0;\nalActualizar(delta) {\n    si (estaTocandoTag(\"Suelo\")) saltos = 0;\n    si (teclaRecienPresionada(\"Space\") y saltos < 2) {\n        fisica.applyImpulse(0, -10);\n        saltos += 1;\n    }\n}" },
    { name: "Cámara: Shake", code: "ve motor;\npublico numero fuerza = 5;\nalRecibir(\"shake\", () => {\n    cada(0.02) {\n        posicion.x += azar(-fuerza, fuerza);\n        posicion.y += azar(-fuerza, fuerza);\n    }\n    esperar(0.5);\n    detener();\n});" },
    { name: "Vehículo: Top-Down", code: "ve motor;\npublico numero potencia = 10;\npublico numero giro = 5;\nalActualizar(delta) {\n    si (teclaPresionada(\"w\")) {\n        variable rad = rotacion * 3.14 / 180;\n        fisica.velocity.x += coseno(rad) * potencia;\n        fisica.velocity.y += seno(rad) * potencia;\n    }\n    si (teclaPresionada(\"a\")) rotacion -= giro;\n    si (teclaPresionada(\"d\")) rotacion += giro;\n}" },
    { name: "IA: Huida", code: "ve motor;\npublico mtr amenaza;\nalActualizar(delta) {\n    si (amenaza y distancia(posicion, amenaza.posicion) < 200) {\n        variable dir = nuevo Vector2(x - amenaza.x, y - amenaza.y);\n        posicion.x += dir.x * delta * 5;\n        posicion.y += dir.y * delta * 5;\n    }\n}" },
    { name: "Partículas: Explosión", code: "ve motor;\nalRecibir(\"explotar\", () => {\n    sistemaDeParticulas.play();\n    esperar(1);\n    sistemaDeParticulas.stop();\n});" },
    { name: "Luz: Parpadeo", code: "ve motor;\nalActualizar(delta) {\n    luzPuntual2D.intensity = 1 + seno(tiempoDelta * 10) * 0.5;\n}" },
    { name: "Inventario: Soltar", code: "ve motor;\npublico Prefab item;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"q\")) {\n        instanciar(item, x, y + 20);\n    }\n}" },
    { name: "UI: Diálogo", code: "ve motor;\npublico texto mensaje = \"Hola viajero\";\nalHacerClick() {\n    uiTexto.contenido = mensaje;\n    esperar(3);\n    uiTexto.contenido = \"\";\n}" },
    { name: "Física: Rebote", code: "ve motor;\nalEntrarEnColision(otro) {\n    fisica.applyImpulse(nuevo Vector2(0, -5));\n}" },
    { name: "Escena: Reiniciar", code: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"r\")) cargarEscena(nombreEscenaActual);\n}" },
    { name: "Animación: Velocidad", code: "ve motor;\nalActualizar(delta) {\n    animador.speed = absoluto(fisica.velocity.x) / 10;\n}" },
    { name: "IA: Patrulla Waypoints", code: "ve motor;\npublico mtr puntoA;\npublico mtr puntoB;\nvariable haciaA = verdadero;\nalActualizar(delta) {\n    variable obj = haciaA ? puntoA : puntoB;\n    si (obj) {\n        moverHacia(obj.posicion, 100 * delta);\n        si (distancia(posicion, obj.posicion) < 5) haciaA = !haciaA;\n    }\n}" },
    { name: "UI: Menú Pausa", code: "ve motor;\nvariable pausado = falso;\nalActualizar(delta) {\n    si (teclaRecienPresionada('Escape')) {\n        pausado = !pausado;\n        motor.timeScale = pausado ? 0 : 1;\n        uiPanelPausa.isActive = pausado;\n    }\n}" },
    { name: "Física: Gravedad Zero", code: "ve motor;\nalEmpezar() {\n    fisica.gravityScale = 0;\n}\nalActualizar(delta) {\n    si (teclaPresionada('w')) fisica.addForce(0, -10);\n    si (teclaPresionada('s')) fisica.addForce(0, 10);\n}" },
    { name: "VFX: Estela", code: "ve motor;\nalActualizar(delta) {\n    si (absoluto(fisica.velocity.x) > 1) {\n        sistemaDeParticulas.emitRate = 20;\n    } sino {\n        sistemaDeParticulas.emitRate = 0;\n    }\n}" },
    { name: "Gameplay: Score", code: "ve motor;\nvariable puntos = 0;\nalRecibir('enemigo_muerto', () => {\n    puntos += 100;\n    uiTextoScore.contenido = 'Score: ' + puntos;\n});" }
];

// Generate 1000+ variations (Massive Library v3.3)
for(let i=0; i<1000; i++) {
    const t = templates[i % templates.length];
    examples.push({
        title: `${t.name} (Variación ${i + 1})`,
        code: t.code.replace(/100/g, (i+1)*5).replace(/#ff0000/g, i % 3 == 0 ? "#00ff00" : (i % 3 == 1 ? "#0000ff" : "#ffff00"))
    });
}
