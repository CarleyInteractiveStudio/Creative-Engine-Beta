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

// --- SMART SEMANTIC RULES ---

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
    'velocidadX', 'velocidadY', 'velocityX', 'velocityY', 'alChocar', 'alClicar', 'alPulsar',
    'wait', 'esperarPT', 'ждать', '等待',
    'tempoDelta', 'дельтаВремя', '增量时间',
    'nome', 'имя', '名称',
    'etiqueta', 'тег', '标签',
    'rotacao', 'вращение', '旋转',
    'масштаб', '缩放',
    'moverPT', 'переместить', '移动',
    'rotarPT', 'вращать',
    'escalarPT', 'масштабировать',
    'obterComponente', 'получитьКомпонент', '获取组件',
    'obterComponenteNoPai', 'получитьКомпонентВРодителе', '在父级中获取组件',
    'obterComponenteNosFilhos', 'получитьКомпонентВДочерних', '在子级中获取组件',
    'aplicarForca', 'приложитьСилу', '施加力',
    'aplicarImpulsoPT', 'приложитьИмпульс', '施加脉冲',
    'definirVelocidade', 'установитьСкорость', '设置速度',
    'aplicarTorquePT', 'приложитьКрутящийМомент', '施加扭矩',
    'causarDano', 'нанестиУрон', '造成伤害',
    'curarPT', 'лечить', '治疗',
    'vidaMaximaPT', 'максЗдоровье', '最大健康',
    'vidaActual', 'vidaAtual', 'текущееЗдоровье', '当前健康',
    'teclaPressionada', 'клавишаНажата', '按键按下',
    'teclaRecemPressionada', 'клавишаТолькоЧтоНажата', '按键刚刚按下',
    'teclaLiberadaPT', 'клавишаОтпущена', '按键释放',
    'botaoMousePressionado', 'кнопкаМышиНажата', '鼠标按钮按下',
    'botaoMouseRecemPressionado', 'кнопкаМышиТолькоЧтоНажата', '鼠标按钮刚刚按下',
    'botaoMouseLiberado', 'кнопкаМышиОтпущена', '鼠标按钮释放',
    'obterPosicaoMouse', 'получитьПозициюМыши', '获取鼠标位置',
    'controleConectado', 'джойстикПодключен', '手柄已连接',
    'controleBotaoPressionado', 'кнопкаДжойстикаНажата', '手柄按钮按下',
    'controleBotaoRecemPressionado', 'кнопкаДжойстикаТолькоЧтоНажата', '手柄按钮刚刚按下',
    'controleEixo', 'осьДжойстика', '手柄轴',
    'reproduzirAnimacaoPT', 'игратьАнимацию', '播放动画',
    'pararAnimacao', 'остановитьАнимацию', '停止动画',
    'parar', 'остановить', '停止',
    'pausar', 'pausarPT', 'пауза', '暂停',
    'reiniciarPT', 'сбросить', '重置',
    'buscarTempo', 'buscarTempoPT', 'перемотать', '跳转时间',
    'префаб', '预制件',
    'maxParticulasPT', 'максЧастиц', '最大粒子数',
    'taxaEmissao', 'скоростьЭмиссии', '发射率',
    'vidaParticulaPT', 'времяЖизни', '粒子寿命',
    'dispersao', '扩散',
    'цикл', '循环',
    'reproduzirAoIniciar', 'игратьПриЗапуске', '唤醒时播放',
    'largura', 'ширина', '宽度',
    'altura', 'высота', '高度',
    'densidade', '密度',
    'viscosidade', 'вязкость', '粘度',
    'mostrarMares', 'показыватьПриливы', '显示潮汐',
    'amplitudeMarea', 'амплитудаПрилива', '潮汐幅度',
    'velocidadeMarea', 'скоростьПрилива', '潮汐速度',
    'caminhoCena', 'путьКПроекту', '场景路径',
    'etiquetaAtivadora', 'активирующийТег',
    'teclaAtivadora', 'активирующаяКлавиша',
    'materiaBotao', 'материяКнопки', '按钮物质',
    'ataquesPT', 'атаки', '攻击列表',
    'materiaColisor', 'материяКоллайдера', '碰撞体物质',
    'tempoEspera', 'времяОжидания',
    'teclaCicloPT', 'клавишаЦикла', '循环按键',
    'valorPT', 'значение', '值',
    'valorMaximoPT', 'максЗначение', '最大值',
    'materiaObjetivoPT', 'целеваяМатерия', '目标物质',
    'materiaPreenchimento', 'заполняющаяМатерия', '填充物质',
    'tamanhoTotal', 'общийРазмер', '总大小'
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
        elements: ["posicion", "velocidad", "delta", "position", "speed"],
        completion: "posicion.x += velocidad * delta;",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Collision to Health",
        trigger: /alEntrarEnColision|alChocar|onCollisionEnter/i,
        elements: ["tieneTag", "vida", "danio|daño", "hasTag", "health", "damage"],
        completion: "si (otro.tieneTag('Enemigo')) { vida -= 10; }",
        preferredLifecycle: "alEntrarEnColision"
    },
    {
        name: "Timer Loop",
        trigger: /alEmpezar|start/i,
        elements: ["cada", "esperar", "wait"],
        completion: "cada(1) { /* logica aqui */ }",
        preferredLifecycle: "alEmpezar"
    },
    {
        name: "UI Button Click",
        trigger: /alHacerClick|alClicar|onClick/i,
        elements: ["imprimir", "cargarEscena", "destruir", "log", "loadScene", "destroy"],
        completion: "imprimir('Boton clickeado');",
        preferredLifecycle: "alHacerClick"
    },
    {
        name: "Prefab Instantiation",
        trigger: /teclaRecienPresionada|alActualizar|isKeyJustPressed|update/i,
        elements: ["instanciar|crear|instantiate|create", "Vector2", "posicion|position"],
        completion: "instanciar(proyectil, posicion.x, posicion.y);",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Health Decay and Death",
        trigger: /vida\s*-=|dañar|health\s*-=|damage/i,
        elements: ["si|if", "0", "destruir|muerte|destroy|death"],
        completion: "si (vida <= 0) {\n    reproducir.Muerte();\n    destruir(materia);\n}",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Advanced Movement",
        trigger: /velocidad|moverse|speed|move/i,
        elements: ["rotacion|rotation", "coseno|cos", "seno|sin", "fisica"],
        completion: "variable rad = rotacion * 3.14 / 180;\nfisica.velocidad.x = coseno(rad) * velocidad;\nfisica.velocidad.y = seno(rad) * velocidad;",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Interaction System",
        trigger: /lanzarRayo|raycast/i,
        elements: ["mtr", "distancia|distance", "tieneTag|hasTag"],
        completion: "variable hit = lanzarRayo(posicion, nuevo Vector2(1,0), 100);\nsi (hit && hit.tieneTag('Interactivo')) {\n    difundir('interactuar', hit);\n}",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "State Toggle",
        trigger: /teclaRecienPresionada|isKeyJustPressed/i,
        elements: ["booleano|boolean", "!", "activo|active"],
        completion: "variable activo = !activo;\nrenderizadorDeSprite.activo = activo;",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Automatic Flip",
        trigger: /velocidad|velX|velY|x\s*\+=|x\s*-=|speed/i,
        elements: ["voltearH|flipX", "voltear|flip"],
        completion: "si (fisica.velocidad.x > 0) voltearH = falso;\nsi (fisica.velocidad.x < 0) voltearH = verdadero;",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Audio Feedback",
        trigger: /alHacerClick|alPresionar|teclaRecienPresionada|onClick|onPress|isKeyJustPressed/i,
        elements: ["reproducir|play", "audio|sonido|sound"],
        completion: "reproducir.Accion();",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "UI sync",
        trigger: /vida|puntos|progreso|health|points|progress/i,
        elements: ["valor|value", "uiBarra|uiTexto|uiBar|uiText"],
        completion: "uiBarra.valor = vidaActual;\nuiTexto.contenido = 'Vida: ' + vidaActual;",
        preferredLifecycle: "alActualizar"
    },
    {
        name: "Particle burst",
        trigger: /colision|destruir|golpe|collision|destroy|hit/i,
        elements: ["particula|particle", "play|stop"],
        completion: "sistemaDeParticulas.play();\nesperar(0.5);\nsistemaDeParticulas.stop();",
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
    },
    {
        name: { es: "Mecánica: Perseguir Jugador", en: "Mechanic: Chase Player" },
        keywords: ["perseguir", "ia", "seguir", "chase", "ai", "follow"],
        code: {
            es: `si (jugador && distancia(posicion, jugador.posicion) < 400) {\n    variable dir = jugador.x > x ? 1 : -1;\n    posicion.x += dir * velocidad * delta;\n    voltearH = (dir < 0);\n}`,
            en: `if (player && distance(position, player.position) < 400) {\n    variable dir = player.x > x ? 1 : -1;\n    position.x += dir * speed * delta;\n    flipX = (dir < 0);\n}`
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
        message: "⚠️ ¡Cuidado! Instanciar objetos cada frame puede causar lentitud. Asegúrate de que esté dentro de una condición 'si'.",
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
    },
    {
        name: { es: "Jefe: Fase 1", en: "Boss: Phase 1" },
        code: {
            es: "ve motor;\npublico numero vida = 500;\nalActualizar(delta) {\n    si (vida > 250) {\n        rotacion += 100 * delta;\n        cada(1) { instanciar(proyectil, x, y); }\n    }\n}",
            en: "go motor;\npublic number health = 500;\nupdate(delta) {\n    if (health > 250) {\n        rotation += 100 * delta;\n        cada(1) { instantiate(projectile, x, y); }\n    }\n}"
        }
    },
    {
        name: { es: "Inventario: Añadir", en: "Inventory: Add" },
        code: {
            es: "ve motor;\nalEmpezar() {\n    alRecibir(\"item_suelo\", (data) => {\n        imprimir(\"Recogido: \" + data.nombre);\n        destruir(materia);\n    });\n}",
            en: "go motor;\nstart() {\n    onReceive(\"ground_item\", (data) => {\n        log(\"Collected: \" + data.name);\n        destroy(materia);\n    });\n}"
        }
    },
    {
        name: { es: "Efecto: Parpadeo", en: "Effect: Blink" },
        code: {
            es: "ve motor;\ncada(0.5) {\n    renderizadorDeSprite.activo = !renderizadorDeSprite.activo;\n}",
            en: "go motor;\ncada(0.5) {\n    spriteRenderer.activo = !spriteRenderer.activo;\n}"
        }
    },
    {
        name: { es: "Gravedad: Flotación", en: "Gravity: Floating" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    fisica.addForce(0, -9.8 * 0.5);\n}",
            en: "go motor;\nupdate(delta) {\n    fisica.addForce(0, -9.8 * 0.5);\n}"
        }
    },
    {
        name: { es: "Control: Salto Doble", en: "Control: Double Jump" },
        code: {
            es: "ve motor;\nvariable saltos = 0;\nalActualizar(delta) {\n    si (estaTocandoTag(\"Suelo\")) saltos = 0;\n    si (teclaRecienPresionada(\"Space\") y saltos < 2) {\n        fisica.applyImpulse(0, -10);\n        saltos += 1;\n    }\n}",
            en: "go motor;\nvariable jumps = 0;\nupdate(delta) {\n    if (isTouchingTag(\"Ground\")) jumps = 0;\n    if (isKeyJustPressed(\"Space\") and jumps < 2) {\n        fisica.applyImpulse(0, -10);\n        jumps += 1;\n    }\n}"
        }
    },
    {
        name: { es: "Cámara: Shake", en: "Camera: Shake" },
        code: {
            es: "ve motor;\npublico numero fuerza = 5;\nalEmpezar() {\n    alRecibir(\"shake\", () => {\n        cada(0.02) {\n            posicion.x += azar(-fuerza, fuerza);\n            posicion.y += azar(-fuerza, fuerza);\n        }\n        esperar(0.5);\n        detener();\n    });\n}",
            en: "go motor;\npublic number force = 5;\nstart() {\n    onReceive(\"shake\", () => {\n        cada(0.02) {\n            position.x += random(-force, force);\n            position.y += random(-force, force);\n        }\n        wait(0.5);\n        stop();\n    });\n}"
        }
    },
    {
        name: { es: "Vehículo: Top-Down", en: "Vehicle: Top-Down" },
        code: {
            es: "ve motor;\npublico numero potencia = 10;\npublico numero giro = 5;\nalActualizar(delta) {\n    si (teclaPresionada(\"w\")) {\n        variable rad = rotacion * 3.14 / 180;\n        fisica.velocidad.x += coseno(rad) * potencia;\n        fisica.velocidad.y += seno(rad) * potencia;\n    }\n    si (teclaPresionada(\"a\")) rotacion -= giro;\n    si (teclaPresionada(\"d\")) rotacion += giro;\n}",
            en: "go motor;\npublic number power = 10;\npublic number turn = 5;\nupdate(delta) {\n    if (isKeyPressed(\"w\")) {\n        variable rad = rotation * 3.14 / 180;\n        fisica.velocity.x += cos(rad) * power;\n        fisica.velocity.y += sin(rad) * power;\n    }\n    if (isKeyPressed(\"a\")) rotation -= turn;\n    if (isKeyPressed(\"d\")) rotation += turn;\n}"
        }
    },
    {
        name: { es: "IA: Huida", en: "AI: Escape" },
        code: {
            es: "ve motor;\npublico mtr amenaza;\nalActualizar(delta) {\n    si (amenaza y distancia(posicion, amenaza.posicion) < 200) {\n        variable dir = nuevo Vector2(x - amenaza.x, y - amenaza.y);\n        posicion.x += dir.x * delta * 5;\n        posicion.y += dir.y * delta * 5;\n    }\n}",
            en: "go motor;\npublic mtr threat;\nupdate(delta) {\n    if (threat and distance(position, threat.position) < 200) {\n        variable dir = new Vector2(x - threat.x, y - threat.y);\n        position.x += dir.x * delta * 5;\n        position.y += dir.y * delta * 5;\n    }\n}"
        }
    },
    {
        name: { es: "Partículas: Explosión", en: "Particles: Explosion" },
        code: {
            es: "ve motor;\nalEmpezar() {\n    alRecibir(\"explotar\", () => {\n        sistemaDeParticulas.play();\n        esperar(1);\n        sistemaDeParticulas.stop();\n    });\n}",
            en: "go motor;\nstart() {\n    onReceive(\"explode\", () => {\n        particleSystem.play();\n        wait(1);\n        particleSystem.stop();\n    });\n}"
        }
    },
    {
        name: { es: "Luz: Parpadeo", en: "Light: Flicker" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    luzPuntual2D.intensity = 1 + seno(tiempoDelta * 10) * 0.5;\n}",
            en: "go motor;\nupdate(delta) {\n    pointLight2D.intensity = 1 + sin(tempoDelta * 10) * 0.5;\n}"
        }
    },
    {
        name: { es: "Inventario: Soltar", en: "Inventory: Drop" },
        code: {
            es: "ve motor;\npublico Prefab item;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"q\")) {\n        instanciar(item, x, y + 20);\n    }\n}",
            en: "go motor;\npublic Prefab item;\nupdate(delta) {\n    if (isKeyJustPressed(\"q\")) {\n        instantiate(item, x, y + 20);\n    }\n}"
        }
    },
    {
        name: { es: "UI: Diálogo", en: "UI: Dialogue" },
        code: {
            es: "ve motor;\npublico texto mensaje = \"Hola viajero\";\nalHacerClick() {\n    uiTexto.contenido = mensaje;\n    esperar(3);\n    uiTexto.contenido = \"\";\n}",
            en: "go motor;\npublic text message = \"Hello traveler\";\nalHacerClick() {\n    uiText.content = message;\n    wait(3);\n    uiText.content = \"\";\n}"
        }
    },
    {
        name: { es: "Física: Rebote", en: "Physics: Bounce" },
        code: {
            es: "ve motor;\nalEntrarEnColision(otro) {\n    fisica.applyImpulse(nuevo Vector2(0, -5));\n}",
            en: "go motor;\nalEntrarEnColision(other) {\n    fisica.applyImpulse(new Vector2(0, -5));\n}"
        }
    },
    {
        name: { es: "Escena: Reiniciar", en: "Scene: Restart" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada(\"r\")) cargarEscena(nombreEscenaActual);\n}",
            en: "go motor;\nupdate(delta) {\n    if (isKeyJustPressed(\"r\")) loadScene(currentSceneName);\n}"
        }
    },
    {
        name: { es: "Animación: Velocidad", en: "Animation: Speed" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    animador.speed = absoluto(fisica.velocidad.x) / 10;\n}",
            en: "go motor;\nupdate(delta) {\n    animator.speed = abs(fisica.velocity.x) / 10;\n}"
        }
    },
    {
        name: { es: "IA: Patrulla Waypoints", en: "AI: Waypoint Patrol" },
        code: {
            es: "ve motor;\npublico mtr puntoA;\npublico mtr puntoB;\nvariable haciaA = verdadero;\nalActualizar(delta) {\n    variable obj = haciaA ? puntoA : puntoB;\n    si (obj) {\n        moverHacia(obj.posicion, 100 * delta);\n        si (distancia(posicion, obj.posicion) < 5) haciaA = !haciaA;\n    }\n}",
            en: "go motor;\npublic mtr pointA;\npublic mtr pointB;\nvariable towardsA = true;\nupdate(delta) {\n    variable obj = towardsA ? pointA : pointB;\n    if (obj) {\n        moveTowards(obj.position, 100 * delta);\n        if (distance(position, obj.position) < 5) towardsA = !towardsA;\n    }\n}"
        }
    },
    {
        name: { es: "UI: Menú Pausa", en: "UI: Pause Menu" },
        code: {
            es: "ve motor;\nvariable pausado = falso;\nalActualizar(delta) {\n    si (teclaRecienPresionada('Escape')) {\n        pausado = !pausado;\n        motor.timeScale = pausado ? 0 : 1;\n        uiPanelPausa.activo = pausado;\n    }\n}",
            en: "go motor;\nvariable paused = false;\nupdate(delta) {\n    if (isKeyJustPressed('Escape')) {\n        paused = !paused;\n        engine.timeScale = paused ? 0 : 1;\n        uiPausePanel.activo = paused;\n    }\n}"
        }
    },
    {
        name: { es: "Física: Gravedad Zero", en: "Physics: Zero Gravity" },
        code: {
            es: "ve motor;\nalEmpezar() {\n    fisica.gravityScale = 0;\n}\nalActualizar(delta) {\n    si (teclaPresionada('w')) fisica.addForce(0, -10);\n    si (teclaPresionada('s')) fisica.addForce(0, 10);\n}",
            en: "go motor;\nstart() {\n    fisica.gravityScale = 0;\n}\nupdate(delta) {\n    if (isKeyPressed('w')) fisica.addForce(0, -10);\n    if (isKeyPressed('s')) fisica.addForce(0, 10);\n}"
        }
    },
    {
        name: { es: "VFX: Estela", en: "VFX: Trail" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (absoluto(fisica.velocidad.x) > 1) {\n        sistemaDeParticulas.emitRate = 20;\n    } sino {\n        sistemaDeParticulas.emitRate = 0;\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    if (abs(fisica.velocity.x) > 1) {\n        particleSystem.emitRate = 20;\n    } else {\n        particleSystem.emitRate = 0;\n    }\n}"
        }
    },
    {
        name: { es: "Gameplay: Score", en: "Gameplay: Score" },
        code: {
            es: "ve motor;\nvariable puntos = 0;\nalEmpezar() {\n    alRecibir('enemigo_muerto', () => {\n        puntos += 100;\n        uiTextoScore.contenido = 'Score: ' + puntos;\n    });\n}",
            en: "go motor;\nvariable points = 0;\nstart() {\n    onReceive('enemy_dead', () => {\n        points += 100;\n        uiScoreText.content = 'Score: ' + points;\n    });\n}"
        }
    },
    {
        name: { es: "Puzzle: Botón Presión", en: "Puzzle: Pressure Button" },
        code: {
            es: "ve motor;\npublico mtr puerta;\nalEntrarEnColision(otro) {\n    si (otro.tieneTag('Player')) {\n        puerta.activo = falso;\n        renderizadorDeSprite.color = '#00ff00';\n    }\n}",
            en: "go motor;\npublic mtr door;\nalEntrarEnColision(other) {\n    if (other.hasTag('Player')) {\n        door.activo = false;\n        spriteRenderer.color = '#00ff00';\n    }\n}"
        }
    },
    {
        name: { es: "Puzzle: Recoger Llave", en: "Puzzle: Collect Key" },
        code: {
            es: "ve motor;\nalEntrarEnColision(otro) {\n    si (otro.tieneTag('Player')) {\n        difundir('llave_obtenida');\n        destruir(materia);\n    }\n}",
            en: "go motor;\nalEntrarEnColision(other) {\n    if (other.hasTag('Player')) {\n        broadcast('key_obtained');\n        destroy(materia);\n    }\n}"
        }
    },
    {
        name: { es: "Tower Defense: Disparar a Rango", en: "Tower Defense: Shoot in Range" },
        code: {
            es: "ve motor;\npublico numero rango = 300;\npublico Prefab proyectil;\nvariable cooldown = 0;\nalActualizar(delta) {\n    cooldown -= delta;\n    variable enemigo = buscarCercano('Enemigo');\n    si (enemigo && distancia(posicion, enemigo.posicion) < rango && cooldown <= 0) {\n        instanciar(proyectil, x, y);\n        cooldown = 1.0;\n    }\n}",
            en: "go motor;\npublic number range = 300;\npublic Prefab projectile;\nvariable cooldown = 0;\nupdate(delta) {\n    cooldown -= delta;\n    variable enemy = findNearest('Enemy');\n    if (enemy and distance(position, enemy.position) < range and cooldown <= 0) {\n        instantiate(projectile, x, y);\n        cooldown = 1.0;\n    }\n}"
        }
    },
    {
        name: { es: "Clicker: Ganar Oro", en: "Clicker: Gain Gold" },
        code: {
            es: "ve motor;\nvariable oro = 0;\nalHacerClick() {\n    oro += 1;\n    uiTextoOro.contenido = 'Oro: ' + oro;\n    reproducir.Moneda();\n}",
            en: "go motor;\nvariable gold = 0;\nalHacerClick() {\n    gold += 1;\n    uiGoldText.content = 'Gold: ' + gold;\n    play.Coin();\n}"
        }
    },
    {
        name: { es: "RPG: Diálogo Proximidad", en: "RPG: Proximity Dialogue" },
        code: {
            es: "ve motor;\npublico mtr jugador;\nalActualizar(delta) {\n    si (jugador && distancia(posicion, jugador.posicion) < 100) {\n        uiTextoDialogo.contenido = '¡Hola!';\n    } sino {\n        uiTextoDialogo.contenido = '';\n    }\n}",
            en: "go motor;\npublic mtr player;\nupdate(delta) {\n    if (player and distance(position, player.position) < 100) {\n        uiDialogueText.content = 'Hello!';\n    } else {\n        uiDialogueText.content = '';\n    }\n}"
        }
    },
    {
        name: { es: "Shooter: Retroceso", en: "Shooter: Recoil" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada('f')) {\n        posicion.x -= voltearH ? -5 : 5;\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    if (isKeyJustPressed('f')) {\n        position.x -= flipX ? -5 : 5;\n    }\n}"
        }
    },
    {
        name: { es: "Habilidad: Invisibilidad", en: "Ability: Invisibility" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada('i')) {\n        renderizadorDeSprite.opacity = 0.2;\n        esperar(5);\n        renderizadorDeSprite.opacity = 1.0;\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    if (isKeyJustPressed('i')) {\n        spriteRenderer.opacity = 0.2;\n        wait(5);\n        spriteRenderer.opacity = 1.0;\n    }\n}"
        }
    },
    {
        name: { es: "Efecto: Cambio Escala al Saltar", en: "Effect: Scale Change on Jump" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada('Space')) {\n        escala.y = 1.5;\n        escala.x = 0.7;\n        esperar(0.2);\n        escala.y = 1.0;\n        escala.x = 1.0;\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    if (isKeyJustPressed('Space')) {\n        scale.y = 1.5;\n        scale.x = 0.7;\n        wait(0.2);\n        scale.y = 1.0;\n        scale.x = 1.0;\n    }\n}"
        }
    },
    {
        name: { es: "UI: Vida Flotante", en: "UI: Floating Health" },
        code: {
            es: "ve motor;\npublico mtr objetivo;\nalActualizar(delta) {\n    si (objetivo) {\n        posicion.x = objetivo.posicion.x;\n        posicion.y = objetivo.posicion.y - 50;\n    }\n}",
            en: "go motor;\npublic mtr target;\nupdate(delta) {\n    if (target) {\n        position.x = target.position.x;\n        position.y = target.position.y - 50;\n    }\n}"
        }
    },
    {
        name: { es: "IA: Esquivar Proyectil", en: "AI: Dodge Projectile" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    variable bala = buscarCercano('Bala');\n    si (bala && distancia(posicion, bala.posicion) < 150) {\n        posicion.y += 200 * delta;\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    variable bullet = findNearest('Bullet');\n    if (bullet and distance(position, bullet.position) < 150) {\n        position.y += 200 * delta;\n    }\n}"
        }
    },
    // New templates v4.6
    {
        name: { es: "Combate: Combo Melee", en: "Combat: Melee Combo" },
        code: {
            es: "ve motor;\nvariable combo = 0;\nalActualizar(delta) {\n    si (teclaRecienPresionada('x')) {\n        combo += 1;\n        reproducir.Atacar(combo);\n        si (combo > 3) combo = 0;\n        esperar(0.5);\n    }\n}",
            en: "go motor;\nvariable combo = 0;\nupdate(delta) {\n    if (isKeyJustPressed('x')) {\n        combo += 1;\n        play.Attack(combo);\n        if (combo > 3) combo = 0;\n        wait(0.5);\n    }\n}"
        }
    },
    {
        name: { es: "Sistema: Ciclo Dia/Noche", en: "System: Day/Night Cycle" },
        code: {
            es: "ve motor;\npublico numero hora = 0;\nalActualizar(delta) {\n    hora += delta * 0.1;\n    si (hora > 24) hora = 0;\n    luzGlobal.intensity = absoluto(coseno(hora * 3.14 / 12));\n}",
            en: "go motor;\npublic number hour = 0;\nupdate(delta) {\n    hour += delta * 0.1;\n    if (hour > 24) hour = 0;\n    globalLight.intensity = abs(cos(hour * 3.14 / 12));\n}"
        }
    },
    {
        name: { es: "Puzzle: Gravedad Inversa", en: "Puzzle: Reverse Gravity" },
        code: {
            es: "ve motor;\nalActualizar(delta) {\n    si (teclaRecienPresionada('g')) {\n        fisica.gravityScale *= -1;\n        escala.y *= -1;\n    }\n}",
            en: "go motor;\nupdate(delta) {\n    if (isKeyJustPressed('g')) {\n        fisica.gravityScale *= -1;\n        scale.y *= -1;\n    }\n}"
        }
    },
    {
        name: { es: "RPG: Subir de Nivel", en: "RPG: Level Up" },
        code: {
            es: "ve motor;\nvariable nivel = 1;\nvariable exp = 0;\nganarEXP(cantidad) {\n    exp += cantidad;\n    si (exp >= nivel * 100) {\n        nivel += 1;\n        exp = 0;\n        reproducir.LevelUp();\n        imprimir('Nivel: ' + nivel);\n    }\n}",
            en: "go motor;\nvariable level = 1;\nvariable exp = 0;\ngainEXP(amount) {\n    exp += amount;\n    if (exp >= level * 100) {\n        level += 1;\n        exp = 0;\n        play.LevelUp();\n        log('Level: ' + level);\n    }\n}"
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
