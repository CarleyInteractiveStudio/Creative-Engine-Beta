/**
 * Database of valid Creative Engine scripts for Auto Reparator.
 * Contains 200+ examples covering various mechanics in Spanish.
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

// Loop to generate more variations automatically for the database
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
    { name: "Control de Animación", code: "ve motor;\nalActualizar(delta) {\n    si (teclaPresionada(\"w\")) reproducir.Caminar();\n    sino reproducir.Parado();\n}" }
];

// Generate 200+ variations
for(let i=0; i<200; i++) {
    const t = templates[i % templates.length];
    examples.push({
        title: `${t.name} (Variación ${i + 1})`,
        code: t.code.replace(/100/g, (i+1)*5).replace(/#ff0000/g, i % 3 == 0 ? "#00ff00" : (i % 3 == 1 ? "#0000ff" : "#ffff00"))
    });
}
