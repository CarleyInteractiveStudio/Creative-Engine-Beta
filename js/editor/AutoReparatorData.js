/**
 * Database of valid Creative Engine scripts for Auto Reparator.
 * Contains 4000+ variations covering various mechanics in Spanish and English.
 */
export const examples = [
    // --- 1. MOVIMIENTO (MOVEMENT) ---
    {
        title: "Movimiento Top-Down Simple",
        lang: "es",
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
        title: "Simple Top-Down Movement",
        lang: "en",
        code: `go motor;
public number speed = 5;
update(delta) {
    if (isKeyPressed("w")) position.y -= speed;
    if (isKeyPressed("s")) position.y += speed;
    if (isKeyPressed("a")) position.x -= speed;
    if (isKeyPressed("d")) position.x += speed;
}`
    }
];

export const componentShortcuts = [
    'transform', 'transformacion', 'posicion', 'posição', 'позиция', '位置',
    'rigidbody2D', 'fisica', 'física', 'физика', '物理',
    'animatorController', 'controladorAnimacion', 'controlador',
    'spriteRenderer', 'renderizadorDeSprite', 'renderizadorDeSpritePT', 'рендерСпрайта', '精灵渲染器',
    'audioSource', 'fuenteDeAudio', 'fonteDeÁudio', 'источникЗвука', '音频源',
    'boxCollider2D', 'colisionadorCaja2D',
    'capsuleCollider2D', 'colisionadorCapsula2D',
    'colisionador2d',
    'camera', 'camara', 'câmera', 'камера', '摄像机',
    'animator', 'animador', 'animacion', 'аниматор', '动画器',
    'pointLight2D', 'luzPuntual2D',
    'spotLight2D', 'luzFocal2D',
    'freeformLight2D', 'luzFormaLibre2D',
    'spriteLight2D', 'luzDeSprite2D',
    'tilemap', 'mapaDeAzulejos',
    'tilemapRenderer', 'renderizadorMapaDeAzulejos',
    'tilemapCollider2D', 'colisionadorMapaDeAzulejos2D',
    'compositeCollider2D', 'colisionadorCompuesto2D',
    'grid', 'rejilla',
    'raycastSource', 'rallo',
    'basicAI', 'iaBasica',
    'suspensionHC',
    'vehicleTopDown', 'controladorVehiculoTopDown',
    'planeController', 'controladorDeAvion',
    'helicopterController', 'controladorDeHelicoptero',
    'bone', 'hueso',
    'skeletonRenderer', 'renderizadorDeEsqueleto',
    'ikManager2D', 'gestorIK2D',
    'textureRender', 'renderizadorDeTextura',
    'canvas', 'lienzo',
    'uiImage', 'imagenUI',
    'uiTransform', 'transformacionUI',
    'uiText', 'textoUI',
    'button', 'boton',
    'sonido',
    'uiEventTrigger', 'disparadorDeEventosUI',
    'customComponent', 'componentePersonalizado',
    'parallax',
    'movement', 'movimiento',
    'water', 'agua',
    'lineCollider2D', 'colisionadorLinea2D',
    'particleSystem', 'sistemaDeParticulas', 'particula', 'particulas',
    'audio', 'sonido',
    'cameraFollow', 'seguimientoDeCamara',
    'drawingOrder', 'ordenDeDibujo',
    'verticalLayoutGroup', 'autoDisposicionVertical',
    'horizontalLayoutGroup', 'autoDisposicionHorizontal',
    'gridLayoutGroup', 'autoDisposicionRejilla',
    'contentSizeFitter', 'ajustadorDeTamanoDeContenido',
    'videoPlayer', 'reproductorDeVideo', 'video', 'pelicula',
    'health', 'salud', 'vida', 'saude', 'sante', 'zdorovye', 'jiankang',
    'attack', 'ataque', 'attaque', 'atack', 'gongji',
    'progressBar', 'barraDeProgreso', 'barra', 'uiBarra', 'uiBar', 'uiBarre', 'uiPolosa', 'uiTiao', 'uiSlider', 'deslizador', 'barraProgresso',
    'uiScrollRect', 'rectScroll', 'scroll', 'rolagem', 'parcourir', 'prokrutka', 'gundong',
    'uiMask', 'mascaraUI', 'mascara', 'masque', 'maska', 'zhezao',
    'uiCollider', 'colisionadorUI', 'colisorUI', 'collisionneurUI', 'kollayderUI', 'pengzhuangUI',
    'materia', 'mtr', 'matéria', 'материя', '物质', 'nombre', 'nome', 'имя', '名称', 'tag', 'тег', '标签', 'scene', 'escena', 'cena', 'сцена', '场景', 'input', 'entrada', 'ввод', '输入', 'motor', 'engine', 'двигатель', '引擎',
    'potenciaActual', 'giroActual', 'establecerPotencia', 'establecerGiro',
    'ui', 'texto', 'boton', 'imagen', 'lienzo',
    'obtenerScript', 'getScript', 'destruir', 'destroy', 'instanciar', 'instantiate',
    'crear', 'create', 'estaActivado', 'activo',
    'reproducir', 'play', 'reproduzir', 'воспроизвести', '播放', 'voltearH', 'voltearV', 'flipX', 'flipY', 'inverterH', 'inverterV', 'отразитьГ', 'отразитьВ', '水平翻转', '垂直翻转',
    'tieneTag', 'hasTag', 'lanzarRayo', 'raycast', 'danar', 'damage', 'curar', 'heal',
    'ejecutarAccion', 'executeAction',
    'alEntrarEnColision', 'getCollisionEnter', 'alPermanecerEnColision', 'getCollisionStay', 'alSalirDeColision', 'getCollisionExit',
    'estaTocandoTag', 'isTouchingTag',
    'difundir', 'broadcast', 'alRecibir', 'onReceive',
    'onPointerDown', 'alPresionar', 'onPointerUp', 'alSoltar',
    'onPointerEnter', 'alEntrar', 'onPointerExit', 'alSalir',
    'onPointerClick', 'alHacerClick', 'onPointerDrag', 'alDeslizar',
    'onPointerHold', 'alMantener',
    'buscar', 'find', 'reproducirAnimacion', 'playAnimation', 'detenerAnimacion', 'stopAnimation',
    'obtenerComponente', 'getComponent', 'obtenerComponentes', 'getComponents',
    'azar', 'random', 'seno', 'sin', 'coseno', 'cos', 'tangente', 'tan',
    'raizCuadrada', 'sqrt', 'redondear', 'round', 'piso', 'floor', 'techo', 'ceil',
    'absoluto', 'abs', 'limitar', 'clamp', 'distancia', 'distance', 'Vector2', 'Color',
    'tono', 'pitch', 'estaTocandoSuelo', 'tagsDeDeslizamiento',
    'nivelExpulsion', 'soporte', 'fuerza', 'modoVista', 'potencia', 'velocidadMaxima', 'autoVolteo', 'velocidadGiro', 'intensidadDerrape', 'amortiguacion',
    'dureza', 'longitudReposo', 'potenciaMotor', 'controlAire', 'teclaAcelerar', 'teclaFrenar', 'chasis', 'eje', 'velocidadLimite', 'inclinacionAire',
    'fuerzaInclinacion', 'inclinacion', 'estabilidadAire', 'autoEstabilidad', 'frenadoMotor', 'frenado', 'recuperacionGiro', 'centradoGiro',
    'autoAcelerar', 'potencia', 'potenciaMotor', 'velocidadMaxima', 'velocidadLimite', 'velocidadGiro', 'giro', 'intensidadDerrape', 'derrape',
    'teclaIzquierda', 'teclaDerecha', 'frenadoMotor', 'frenado', 'vDespegue', 'sustentacion', 'arrastre', 'teclaPotencia', 'teclaFreno',
    'teclaNarizArriba', 'teclaNarizAbajo', 'usarTodasLasCapas', 'useAllLayers', 'sourceLayerIndex', 'velocidadDespegue', 'fuerzaSustentacion',
    'agilidadGiro', 'arrastreAire', 'potenciaDespegue', 'autoEstabilizar', 'estabilidad', 'teclaDescenso', 'teclaGiroIzquierda', 'teclaGiroDerecha',
    'teclaBotonFreno', 'frenoEspacio', 'teclaPresionada', 'teclaRecienPresionada', 'teclaLiberada', 'tecla',
    'botonMousePresionado', 'botonMouseRecienPresionado', 'botonMouseLiberado', 'obtenerPosicionMouse',
    'isGamepadConnected', 'mandoConectado', 'isGamepadButtonPressed', 'mandoBotonPresionado',
    'isGamepadButtonJustPressed', 'mandoBotonRecienPresionado', 'getGamepadAxis', 'mandoEje',
    'rotacion', 'rotation', 'escala', 'scale', 'rotar', 'rotate', 'mover', 'move', 'escalar',
    'velocidadX', 'velocidadY', 'velocityX', 'velocityY', 'alChocar', 'alClicar', 'alPulsar'
];

export const intentWeights = {
    movimiento: {
        keywords: ['tecla', 'velocidad', 'vel', 'posicion', 'moverse', 'caminar', 'x', 'y', 'w', 'a', 's', 'd', 'arriba', 'abajo', 'izquierda', 'derecha', 'mover', 'correr', 'dash', 'salto', 'voltear', 'key', 'speed', 'position', 'move', 'walk', 'up', 'down', 'left', 'right', 'run', 'jump', 'flip'],
        requiredComponents: ['Transform'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 10
    },
    fisica: {
        keywords: ['fisica', 'gravedad', 'impulso', 'fuerza', 'velocity', 'salto', 'choque', 'colision', 'rb', 'masa', 'rebotar', 'friccion', 'torque', 'angular', 'empujar', 'physics', 'gravity', 'impulse', 'force', 'jump', 'crash', 'collision', 'mass', 'bounce', 'friction', 'push'],
        requiredComponents: ['Rigidbody2D'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 15
    },
    salud: {
        keywords: ['vida', 'daño', 'curar', 'morir', 'muerte', 'salud', 'health', 'damage', 'heal', 'danar', 'reproducir', 'vidaMaxima', 'revivir', 'life', 'die', 'death', 'play', 'maxHealth', 'revive'],
        requiredComponents: ['Health'],
        preferredLifecycle: 'alEntrarEnColision',
        scoreBoost: 12
    },
    ui: {
        keywords: ['boton', 'click', 'barra', 'texto', 'imagen', 'ui', 'progreso', 'valor', 'pantalla', 'clicar', 'pulsar', 'dialogo', 'menu', 'hover', 'canvas', 'button', 'bar', 'text', 'image', 'progress', 'value', 'screen', 'dialog'],
        requiredComponents: ['UIImage', 'UIText', 'ProgressBar'],
        preferredLifecycle: 'alHacerClick',
        scoreBoost: 10
    },
    combate: {
        keywords: ['atacar', 'bala', 'proyectil', 'disparar', 'fire', 'espada', 'golpe', 'enemigo', 'dañar', 'dañar', 'vida', 'rango', 'distancia', 'objetivo', 'attack', 'bullet', 'projectile', 'shoot', 'sword', 'hit', 'enemy', 'damage', 'health', 'range', 'distance', 'target'],
        requiredComponents: ['Attack'],
        preferredLifecycle: 'alActualizar',
        scoreBoost: 12
    },
    vfx: {
        keywords: ['particula', 'sistemaDeParticulas', 'explosion', 'vfx', 'emision', 'play', 'stop', 'color', 'brillo', 'fuego', 'humo', 'particle', 'particleSystem', 'emission', 'brightness', 'fire', 'smoke'],
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
    { regex: /velocidad|veloidad|fuerza|salto|vida|danio|daño|distancia|masa|gravedad|valor|puntos|cantidad|rango|tiempo|duracion|alpha|opacidad|escala|rotacion|speed|force|jump|health|damage|distance|mass|gravity|value|points|amount|range|time|duration|opacity|scale|rotation/i, type: 'numero' },
    { regex: /nombre|tag|texto|mensaje|nivel|escena|id|ruta|clase|name|text|message|level|scene|path|class/i, type: 'texto' },
    { regex: /activo|puede|esta|es|tocado|listo|abierta|bloqueado|pausado|active|can|is|touched|ready|open|locked|paused/i, type: 'booleano' },
    { regex: /objetivo|meta|jugador|padre|hijo|materia|mtr|target|goal|player|parent|child/i, type: 'mtr' },
    { regex: /prefab|bala|enemigo|item|recompensa|proyectil|bullet|enemy|reward|projectile/i, type: 'Prefab' },
    { regex: /sonido|audio|musica|efecto|clip|pasos|sound|music|effect|steps/i, type: 'Audio' },
    { regex: /icono|imagen|sprite|spritet|textura|fondo|icon|image|texture|background/i, type: 'Sprite' }
];

export const logicPatterns = [
    {
        name: "Input to Movement",
        trigger: /teclaPresionada|teclaRecienPresionada|isKeyPressed|isKeyJustPressed/i,
        intent: "movimiento",
        elements: ["posicion", "velocidad", "delta", "position", "speed"],
        completion: {
            es: "posicion.x += velocidad * delta;",
            en: "position.x += speed * delta;"
        },
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Collision to Health",
        trigger: /alEntrarEnColision|alChocar|onCollisionEnter/i,
        intent: "salud",
        elements: ["tieneTag", "vida", "danio|daño", "hasTag", "health", "damage"],
        completion: {
            es: "si (otro.tieneTag('Enemigo')) { vida -= 10; }",
            en: "if (other.hasTag('Enemy')) { health -= 10; }"
        },
        preferredLifecycle: "alEntrarEnColision"
    },
    {
        name: "Timer Loop",
        trigger: /alEmpezar|start/i,
        elements: ["cada", "esperar", "wait"],
        completion: {
            es: "cada(1) { /* logica aqui */ }",
            en: "cada(1) { /* logic here */ }"
        },
        preferredLifecycle: "alEmpezar"
    },
    {
        name: "UI Button Click",
        trigger: /alHacerClick|alClicar|onClick/i,
        elements: ["imprimir", "cargarEscena", "destruir", "log", "loadScene", "destroy"],
        completion: {
            es: "imprimir('Boton clickeado');",
            en: "log('Button clicked');"
        },
        preferredLifecycle: "alHacerClick"
    },
    {
        name: "Prefab Instantiation",
        trigger: /disparar|bala|fuego|shoot|bullet|fire/i,
        intent: "combate",
        elements: ["instanciar|crear|instantiate|create", "Vector2", "posicion|position"],
        completion: {
            es: "instanciar(proyectil, posicion.x, posicion.y);",
            en: "instantiate(projectile, position.x, position.y);"
        },
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Health Decay and Death",
        trigger: /vida\s*-=|dañar|health\s*-=|damage/i,
        intent: "salud",
        elements: ["si|if", "0", "destruir|muerte|destroy|death"],
        completion: {
            es: "si (vida <= 0) {\n    reproducir.Muerte();\n    destruir(materia);\n}",
            en: "if (health <= 0) {\n    play.Death();\n    destroy(materia);\n}"
        },
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Advanced Movement",
        trigger: /velocidad|moverse|speed|move/i,
        intent: "movimiento",
        elements: ["rotacion|rotation", "coseno|cos", "seno|sin", "fisica"],
        completion: {
            es: "variable rad = rotacion * 3.14 / 180;\nfisica.velocidad.x = coseno(rad) * velocidad;\nfisica.velocidad.y = seno(rad) * velocidad;",
            en: "variable rad = rotation * 3.14 / 180;\nfisica.velocity.x = cos(rad) * speed;\nfisica.velocity.y = sin(rad) * speed;"
        },
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Interaction System",
        trigger: /lanzarRayo|raycast/i,
        elements: ["mtr", "distancia|distance", "tieneTag|hasTag"],
        completion: {
            es: "variable hit = lanzarRayo(posicion, nuevo Vector2(1,0), 100);\nsi (hit && hit.tieneTag('Interactivo')) {\n    difundir('interactuar', hit);\n}",
            en: "variable hit = raycast(position, new Vector2(1,0), 100);\nif (hit && hit.hasTag('Interactive')) {\n    broadcast('interact', hit);\n}"
        },
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Automatic Flip",
        trigger: /velocidad|velX|velY|x\s*\+=|x\s*-=|speed/i,
        intent: "movimiento",
        elements: ["voltearH|flipX", "voltear|flip"],
        completion: {
            es: "si (fisica.velocidad.x > 0) voltearH = falso;\nsi (fisica.velocidad.x < 0) voltearH = verdadero;",
            en: "if (fisica.velocity.x > 0) flipX = false;\nif (fisica.velocity.x < 0) flipX = true;"
        },
        preferredLifecycle: "alActualizar"
    },
    {
        name: "UI sync",
        trigger: /vida|puntos|progreso|health|points|progress/i,
        elements: ["valor|value", "uiBarra|uiTexto|uiBar|uiText"],
        completion: {
            es: "uiBarra.valor = vidaActual;\nuiTexto.contenido = 'Vida: ' + vidaActual;",
            en: "uiBar.value = healthActual;\nuiText.content = 'Health: ' + healthActual;"
        },
        preferredLifecycle: "alActualizar"
    }
];

export const blockTemplates = [
    {
        name: { es: "Mecánica: Salto Completo", en: "Mechanic: Full Jump" },
        keywords: ["salto", "saltar", "suelo", "jump", "ground"],
        code: {
            es: `si (teclaRecienPresionada("Space") y estaTocandoTag("Suelo")) {\n    fisica.applyImpulse(nuevo Vector2(0, -10));\n    reproducir.Salto();\n}`,
            en: `if (isKeyJustPressed("Space") and isTouchingTag("Ground")) {\n    fisica.applyImpulse(new Vector2(0, -10));\n    play.Jump();\n}`
        }
    },
    {
        name: { es: "Mecánica: Disparo Proyectil", en: "Mechanic: Projectile Shooting" },
        keywords: ["disparar", "fuego", "bala", "shoot", "fire", "bullet"],
        code: {
            es: `si (teclaRecienPresionada("f")) {\n    variable bala = instanciar(proyectil, posicion.x, posicion.y);\n    bala.fisica.velocidad.x = voltearH ? -20 : 20;\n    reproducir.Disparo();\n}`,
            en: `if (isKeyJustPressed("f")) {\n    variable bullet = instantiate(projectile, position.x, position.y);\n    bullet.fisica.velocidad.x = flipX ? -20 : 20;\n    play.Shoot();\n}`
        }
    }
];

export const expensivePatterns = [
    {
        pattern: /buscar\s*\(/i,
        location: "alActualizar",
        message: {
            es: "⚠️ Ineficiencia detectada: 'buscar()' en alActualizar. Es mejor buscarlo una vez en alEmpezar() y guardarlo en una variable.",
            en: "⚠️ Inefficiency detected: 'find()' in update. It's better to find it once in start() and save it in a variable."
        },
        fix: "publico mtr objRef;"
    },
    {
        pattern: /instanciar\s*\(/i,
        location: "alActualizar",
        message: {
            es: "⚠️ ¡Cuidado! Instanciar objetos cada frame puede causar lentitud. Asegúrate de que esté dentro de una condición 'si'.",
            en: "⚠️ Warning! Instantiating objects every frame can cause slowness. Make sure it is inside an 'if' condition."
        },
        fix: null
    }
];

// Base Templates for massive scale
const templates = [
    {
        name: { es: "Salud y Daño", en: "Health and Damage" },
        code: {
            es: "ve motor;\npublico numero vida = 100;\nalEntrarEnColision(otro) {\n    si (otro.tieneTag(\"Enemigo\")) {\n        vida -= 10;\n        si (vida <= 0) destruir(materia);\n    }\n}",
            en: "go motor;\npublic number health = 100;\nalEntrarEnColision(other) {\n    if (other.hasTag(\"Enemy\")) {\n        health -= 10;\n        if (health <= 0) destroy(materia);\n    }\n}"
        }
    },
    {
        name: { es: "Disparo Proyectil", en: "Projectile Shooting" },
        code: {
            es: "ve motor;\npublico Prefab bala;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"f\")) {\n        instanciar(bala, posicion.x, posicion.y);\n    }\n}",
            en: "go motor;\npublic Prefab bullet;\nupdate(delta) {\n    if (isKeyJustPressed(\"f\")) {\n        instantiate(bullet, position.x, position.y);\n    }\n}"
        }
    },
    {
        name: { es: "Cambio de Color al Click", en: "Color Change on Click" },
        code: {
            es: "ve motor;\nalHacerClick() {\n    renderizadorDeSprite.color = \"#ff0000\";\n}",
            en: "go motor;\nalHacerClick() {\n    spriteRenderer.color = \"#ff0000\";\n}"
        }
    },
    {
        name: { es: "Timer de Destrucción", en: "Destruction Timer" },
        code: {
            es: "ve motor;\nalEmpezar() {\n    esperar(3);\n    destruir(materia);\n}",
            en: "go motor;\nstart() {\n    wait(3);\n    destroy(materia);\n}"
        }
    },
    {
        name: { es: "Loop de Escala", en: "Scale Loop" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    escala.x = 1 + seno(tiempoDelta * 2) * 0.2;\n    escala.y = 1 + seno(tiempoDelta * 2) * 0.2;\n}",
            en: "go motor;\nupdate(delta) {\n    scale.x = 1 + sin(tempoDelta * 2) * 0.2;\n    scale.y = 1 + sin(tempoDelta * 2) * 0.2;\n}"
        }
    },
    {
        name: { es: "Detección por Raycast", en: "Raycast Detection" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    variable hit = lanzarRayo(posicion, nuevo Vector2(1,0), 100, \"Pared\");\n    si (hit) imprimir(\"Pared detectada\");\n}",
            en: "go motor;\nupdate(delta) {\n    variable hit = raycast(position, new Vector2(1,0), 100, \"Wall\");\n    if (hit) log(\"Wall detected\");\n}"
        }
    },
    {
        name: { es: "UI: Actualizar Barra", en: "UI: Update Bar" },
        code: {
            es: "ve motor;\npublico mtr barra;\nalActualizar(delta) {\n    si (barra) {\n        barra.uiBarra.valor = vidaActual;\n    }\n}",
            en: "go motor;\npublic mtr bar;\nupdate(delta) {\n    if (bar) {\n        bar.uiBarra.value = healthActual;\n    }\n}"
        }
    },
    {
        name: { es: "Rotación Continua", en: "Continuous Rotation" },
        code: {
            es: "ve motor;\npublico numero velRot = 90;\nalActualizar(delta) {\n    posicion.rotation += velRot * delta;\n}",
            en: "go motor;\npublic number rotSpeed = 90;\nupdate(delta) {\n    position.rotation += rotSpeed * delta;\n}"
        }
    },
    {
        name: { es: "Teletransporte", en: "Teleport" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"t\")) {\n        posicion.x = azar(0, 800);\n        posicion.y = azar(0, 600);\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    if (isKeyJustPressed(\"t\")) {\n        position.x = random(0, 800);\n        position.y = random(0, 600);\n    }\n}"
        }
    },
    {
        name: { es: "Gravedad Personalizada", en: "Custom Gravity" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    fisica.addForce(0, 9.8);\n}",
            en: "go motor;\nupdate(delta) {\n    fisica.addForce(0, 9.8);\n}"
        }
    },
    {
        name: { es: "IA de Persecución", en: "Chase AI" },
        code: {
            es: "ve motor;\npublico mtr jugador;\nalActualizar(delta) {\n    si (jugador && distancia(posicion, jugador.posicion) < 500) {\n        variable dir = nuevo Vector2(jugador.x - x, jugador.y - y);\n        fisica.velocidad = dir;\n    }\n}",
            en: "go motor;\npublic mtr player;\nupdate(delta) {\n    if (player && distance(position, player.position) < 500) {\n        variable dir = new Vector2(player.x - x, player.y - y);\n        fisica.velocity = dir;\n    }\n}"
        }
    },
    {
        name: { es: "Recolección de Item", en: "Item Collection" },
        code: {
            es: "ve motor;\nalEntrarEnColision(otro) {\n    si (otro.tieneTag(\"Player\")) {\n        difundir(\"item_recogido\", { tipo: \"oro\", cantidad: 10 });\n        destruir(materia);\n    }\n}",
            en: "go motor;\nalEntrarEnColision(other) {\n    if (other.hasTag(\"Player\")) {\n        broadcast(\"item_collected\", { type: \"gold\", amount: 10 });\n        destroy(materia);\n    }\n}"
        }
    },
    {
        name: { es: "Puerta con Llave", en: "Locked Door" },
        code: {
            es: "ve motor;\npublico booleano abierta = falso;\nalEmpezar() {\n    alRecibir(\"llave_obtenida\", () => abierta = verdadero);\n}\nalHacerClick() {\n    si (abierta) destruir(materia);\n}",
            en: "go motor;\npublic boolean open = false;\nstart() {\n    onReceive(\"key_obtained\", () => open = true);\n}\nalHacerClick() {\n    if (open) destroy(materia);\n}"
        }
    },
    {
        name: { es: "Efecto de Temblor", en: "Shake Effect" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    posicion.x += azar(-2, 2);\n    posicion.y += azar(-2, 2);\n}",
            en: "go motor;\nupdate(delta) {\n    position.x += random(-2, 2);\n    position.y += random(-2, 2);\n}"
        }
    },
    {
        name: { es: "Plataforma Móvil", en: "Moving Platform" },
        code: {
            es: "ve motor;\npublico numero rango = 100;\nvariable t = 0;\nalActualizar(delta) {\n    t += delta;\n    posicion.y += seno(t) * rango * delta;\n}",
            en: "go motor;\npublic number range = 100;\nvariable t = 0;\nupdate(delta) {\n    t += delta;\n    position.y += sin(t) * range * delta;\n}"
        }
    },
    {
        name: { es: "Cambio de Escena", en: "Scene Change" },
        code: {
            es: "ve motor;\npublico texto nivel = \"Nivel2\";\nalEntrarEnColision(otro) {\n    si (otro.tieneTag(\"Player\")) cargarEscena(nivel);\n}",
            en: "go motor;\npublic text level = \"Level2\";\nalEntrarEnColision(other) {\n    if (other.hasTag(\"Player\")) cargarEscena(level);\n}"
        }
    },
    {
        name: { es: "Habilidad: Escudo", en: "Ability: Shield" },
        code: {
            es: "ve motor;\nvariable escudoActivo = falso;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"e\")) {\n        escudoActivo = verdadero;\n        renderizadorDeSprite.opacity = 0.5;\n        esperar(2);\n        escudoActivo = falso;\n        renderizadorDeSprite.opacity = 1.0;\n    }\n}",
            en: "go motor;\nvariable shieldActive = false;\nupdate(delta) {\n    if (isKeyJustPressed(\"e\")) {\n        shieldActive = true;\n        spriteRenderer.opacity = 0.5;\n        wait(2);\n        shieldActive = false;\n        spriteRenderer.opacity = 1.0;\n    }\n}"
        }
    },
    {
        name: { es: "Vibración UI", en: "UI Vibration" },
        code: {
            es: "ve motor;\nalHacerClick() {\n    cada(0.05) {\n        posicionUI.x += azar(-5, 5);\n    }\n}",
            en: "go motor;\nalHacerClick() {\n    cada(0.05) {\n        posicionUI.x += random(-5, 5);\n    }\n}"
        }
    },
    {
        name: { es: "IA: Patrulla con Espera", en: "AI: Patrol with Wait" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    mover(100 * delta, 0);\n    si (x > 500) {\n        esperar(2);\n        x = 0;\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    move(100 * delta, 0);\n    if (x > 500) {\n        wait(2);\n        x = 0;\n    }\n}"
        }
    },
    {
        name: { es: "Control de Animación", en: "Animation Control" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (teclaPresionada(\"w\")) reproducir.Caminar();\n    sino reproducir.Parado();\n}",
            en: "go motor;\nupdate(delta) {\n    if (isKeyPressed(\"w\")) play.Walk();\n    else play.Idle();\n}"
        }
    }
];

// Generate 2000 variations per language (Massive Library v4.6)
for(let i=0; i<2000; i++) {
    const t = templates[i % templates.length];
    const randColor = i % 4 == 0 ? "#00ff00" : (i % 4 == 1 ? "#0000ff" : (i % 4 == 2 ? "#ffff00" : "#ff00ff"));
    const randVal = (i + 1) * 3;
    const randKey = i % 3 == 0 ? "w" : (i % 3 == 1 ? "Space" : "f");
    const randTag = i % 2 == 0 ? "Enemigo" : "Suelo";
    const randTagEn = i % 2 == 0 ? "Enemy" : "Ground";

    // ES Variation
    examples.push({
        title: `${t.name.es} (Variación ${i + 1})`,
        lang: "es",
        code: t.code.es
            .replace(/100/g, randVal)
            .replace(/#ff0000/g, randColor)
            .replace(/"w"|'w'/g, `"${randKey}"`)
            .replace(/"f"|'f'/g, `"${randKey}"`)
            .replace(/"Space"|'Space'/g, `"${randKey}"`)
            .replace(/"Enemigo"|'Enemigo'|"Suelo"|'Suelo'/g, `"${randTag}"`)
            .replace(/10/g, (i % 10) + 1)
    });

    // EN Variation
    examples.push({
        title: `${t.name.en} (Variation ${i + 1})`,
        lang: "en",
        code: t.code.en
            .replace(/100/g, randVal)
            .replace(/#ff0000/g, randColor)
            .replace(/"w"|'w'/g, `"${randKey}"`)
            .replace(/"f"|'f'/g, `"${randKey}"`)
            .replace(/"Space"|'Space'/g, `"${randKey}"`)
            .replace(/"Enemy"|'Enemy'|"Ground"|'Ground'/g, `"${randTagEn}"`)
            .replace(/10/g, (i % 10) + 1)
    });
}
