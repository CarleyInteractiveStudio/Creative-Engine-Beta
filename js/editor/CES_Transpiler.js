// CES_Transpiler.js
import * as RuntimeAPIManager from '../engine/RuntimeAPIManager.js';

// --- State ---
const transpiledCodeMap = new Map();
const scriptMetadataMap = new Map(); // Nueva estructura para metadatos

// --- Helper Functions ---

const typeMap = {
    'number': 'number',
    'numero': 'number',
    'número': 'number',
    'dnumber': 'number',
    'dnumero': 'number',
    'númeroPT': 'number',
    'число': 'number',
    '数字': 'number',
    'text': 'string',
    'texto': 'string',
    'текст': 'string',
    '文本': 'string',
    'boolean': 'boolean',
    'booleano': 'boolean',
    'булево': 'boolean',
    '布尔值': 'boolean',
    'Materia': 'Materia',
    'materia': 'Materia',
    'matéria': 'Materia',
    'материя': 'Materia',
    '物质': 'Materia',
    'mtr': 'Materia',
    'Sprite': 'Sprite',
    'спрайт': 'Sprite',
    '精灵': 'Sprite',
    'Audio': 'Audio',
    'áudio': 'Audio',
    'аудио': 'Audio',
    '音频': 'Audio',
    'Prefab': 'Prefab',
    'prefab': 'Prefab',
    'префаб': 'Prefab',
    '预制件': 'Prefab',
    'Scene': 'Scene',
    'escena': 'Scene',
    'cena': 'Scene',
    'сцена': 'Scene',
    '场景': 'Scene',
    'scene': 'Scene',
    'Vector2': 'Vector2',
    'вектор2': 'Vector2',
    '向量2': 'Vector2',
    'Color': 'Color',
    'cor': 'Color',
    'цвет': 'Color',
    '颜色': 'Color',
    'Tag': 'Tag',
    'тег': 'Tag',
    '标签': 'Tag',
    'tag': 'Tag',
    'Layer': 'Layer',
    'camada': 'Layer',
    'слой': 'Layer',
    '图层': 'Layer',
    'layer': 'Layer',
    'audio': 'Audio',
    'sonido': 'Audio',
    'video': 'Video',
    'pelicula': 'Video',
    'sprite': 'Sprite',
    'ui': 'UI',
    'uiImage': 'UIImage',
    'imagen': 'UIImage',
    'animador': 'Animator',
    'controlador': 'AnimatorController',
    'script': 'CreativeScript',
    'animacion': 'Animation',
    'clip': 'Animation',
    'animacionCtr': 'AnimatorController',
    'controlador': 'AnimatorController',
    'accion': 'Action',
    'evento': 'Action',
    // Engine Components
    'Transform': 'Transform',
    'posicion': 'Transform',
    'posição': 'Transform',
    'позиция': 'Transform',
    '位置': 'Transform',
    'UITransform': 'UITransform',
    'SpriteRenderer': 'SpriteRenderer',
    'Rigidbody2D': 'Rigidbody2D',
    'corpoRígido2D': 'Rigidbody2D',
    'твердоеТело2D': 'Rigidbody2D',
    '刚体2D': 'Rigidbody2D',
    'BoxCollider2D': 'BoxCollider2D',
    'CapsuleCollider2D': 'CapsuleCollider2D',
    'Animator': 'Animator',
    'AnimatorController': 'AnimatorController',
    'Camera': 'Camera',
    'CreativeScript': 'CreativeScript',
    'PointLight2D': 'PointLight2D',
    'SpotLight2D': 'SpotLight2D',
    'FreeformLight2D': 'FreeformLight2D',
    'SpriteLight2D': 'SpriteLight2D',
    'Tilemap': 'Tilemap',
    'TilemapRenderer': 'TilemapRenderer',
    'TilemapCollider2D': 'TilemapCollider2D',
    'UIImage': 'UIImage',
    'UIText': 'UIText',
    'Canvas': 'Canvas',
    'Button': 'Button',
    'UIEventTrigger': 'UIEventTrigger',
    'disparadorDeEventosUI': 'UIEventTrigger',
    'Parallax': 'Parallax',
    'Movement': 'Movement',
    'Water': 'Water',
    'agua': 'Water',
    'LineCollider2D': 'LineCollider2D',
    'colisionadorLinea2D': 'LineCollider2D',
    'ParticleSystem': 'ParticleSystem',
    'DrawingOrder': 'DrawingOrder',
    'CameraFollow': 'CameraFollow',
    'VerticalLayoutGroup': 'VerticalLayoutGroup',
    'HorizontalLayoutGroup': 'HorizontalLayoutGroup',
    'GridLayoutGroup': 'GridLayoutGroup',
    'ContentSizeFitter': 'ContentSizeFitter',
    'autoDisposicionVertical': 'VerticalLayoutGroup',
    'autoDisposicionHorizontal': 'HorizontalLayoutGroup',
    'autoDisposicionRejilla': 'GridLayoutGroup',
    'ajustadorDeTamanoDeContenido': 'ContentSizeFitter',
    'SuspensionHC': 'SuspensionHC',
    'suspensionHC': 'SuspensionHC',
    'VehicleTopDown': 'VehicleTopDown',
    'vehicleTopDown': 'VehicleTopDown',
    'controladorVehiculoTopDown': 'VehicleTopDown',
    'PlaneController': 'PlaneController',
    'planeController': 'PlaneController',
    'controladorDeAvion': 'PlaneController',
    'HelicopterController': 'HelicopterController',
    'helicopterController': 'HelicopterController',
    'controladorDeHelicoptero': 'HelicopterController',
    'Bone': 'Bone',
    'hueso': 'Bone',
    'SkeletonRenderer': 'SkeletonRenderer',
    'renderizadorDeEsqueleto': 'SkeletonRenderer',
    'IKManager2D': 'IKManager2D',
    'gestorIK2D': 'IKManager2D',
    'variable': 'any',
    'any': 'any',
    'любой': 'any',
    '任何': 'any'
};

const componentShortcuts = [
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
    'rotacion', 'rotation', 'escala', 'scale', 'rotar', 'rotate', 'mover', 'move', 'escalar'
];

function getDefaultValueForType(canonicalType) {
    switch (canonicalType) {
        case 'number':
             return 0;
        case 'string': return "";
        case 'boolean': return false;
        case 'Materia': return null;
        case 'Sprite': return null;
        case 'Audio': return null;
        case 'Prefab': return null;
        case 'Scene': return null;
        case 'Vector2': return { x: 0, y: 0 };
        case 'Color': return '#ffffff';
        case 'Action': return { targetId: null, functionName: '' };
        default: return null;
    }
}

function parseInitialValue(value, canonicalType) {
    switch (canonicalType) {
        case 'number':
            return parseFloat(value) || 0;
        case 'string':
            // Eliminar comillas si existen
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                return value.slice(1, -1);
            }
            return value;
        case 'boolean':
            return value.toLowerCase() === 'verdadero' || value.toLowerCase() === 'true';
        case 'Materia':
            return null; // Las referencias a objetos no se pueden establecer por defecto
        default:
            // This case should not be hit with the new mandatory types, but kept as a fallback.
            if (!isNaN(parseFloat(value)) && isFinite(value)) return parseFloat(value);
            if (value.toLowerCase() === 'true' || value.toLowerCase() === 'verdadero') return true;
            if (value.toLowerCase() === 'false' || value.toLowerCase() === 'falso') return false;
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) return value.slice(1, -1);
            return value;
    }
}


// --- Public API ---

/**
 * Retrieves the metadata for a given script.
 * @param {string} scriptName The name of the script file.
 * @returns {object | undefined} The script's metadata or undefined.
 */
export function getScriptMetadata(scriptName) {
    return scriptMetadataMap.get(scriptName);
}

/**
 * Internal helper to transpile a block of code (expression or method body).
 */
function transpileBlock(block, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager, customFunctions = []) {
    let body = block;
    // Unicode-aware boundary to prevent matching inside other words
    const UB = '(?![.\\w\\u00C0-\\u017F\\u0400-\\u04FF\\u4E00-\\u9FA5])';
    const PUB = '(?<![.\\w\\u00C0-\\u017F\\u0400-\\u04FF\\u4E00-\\u9FA5])';

    // 2.0: Handle 'cada' blocks (Simplified Timers)
    let cadaMatch;
    const cadaRegex = /\bcada\s*\(([^)]+)\)\s*{/g;
    while ((cadaMatch = cadaRegex.exec(body)) !== null) {
        const startIdx = cadaMatch.index;
        const contentStartIdx = cadaMatch.index + cadaMatch[0].length;
        let braceCount = 1;
        let endIdx = -1;

        for (let i = contentStartIdx; i < body.length; i++) {
            const char = body[i];
            const nextChar = body[i + 1];

            if (char === '"' || char === "'" || char === '`') {
                const quote = char;
                i++;
                while (i < body.length && body[i] !== quote) {
                    if (body[i] === '\\') i++;
                    i++;
                }
                continue;
            }
            if (char === '/' && nextChar === '/') {
                i += 2;
                while (i < body.length && body[i] !== '\n') i++;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                i += 2;
                while (i < body.length && !(body[i] === '*' && body[i + 1] === '/')) i++;
                i++;
                continue;
            }

            if (char === '{') braceCount++;
            else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx !== -1) {
            const interval = cadaMatch[1];
            const cadaBody = body.substring(contentStartIdx, endIdx);
            const replacement = `this._runInterval(${interval}, async () => {${cadaBody}});`;
            body = body.substring(0, startIdx) + replacement + body.substring(endIdx + 1);
            cadaRegex.lastIndex = startIdx + replacement.length;
        }
    }

    // --- Protected String and Comment Extraction ---
    const protectedBlocks = [];
    body = body.replace(/(["'])(?:(?=(\\?))\2.)*?\1|\/\/.*|\/\*[\s\S]*?\*\//g, (match) => {
        protectedBlocks.push(match);
        return `__CES_PROT_${protectedBlocks.length - 1}__`;
    });

    // 2.a: Replace console shortcuts
    body = body.replace(/(?<![.\w])(imprimir|log)\s*\(/g, 'this._userLog(');
    body = body.replace(/(?<![\w])consola\.(imprimir|log)\s*\(/g, 'this._userLog(');

    // 2.b: Replace multilingual keywords
    // We use Unicode-aware word boundaries: (?<![.\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FA5]) and (?![.\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FA5])

    // Spanish
    body = body.replace(new RegExp(`${PUB}si\\s*\\(`, 'g'), 'if (');
    body = body.replace(new RegExp(`${PUB}sino${UB}`, 'g'), 'else');
    body = body.replace(new RegExp(`${PUB}mientras\\s*\\(`, 'g'), 'while (');
    body = body.replace(new RegExp(`${PUB}para${UB}\\s*\\(`, 'g'), 'for (');
    body = body.replace(new RegExp(`${PUB}retornar${UB}`, 'g'), 'return');
    body = body.replace(new RegExp(`${PUB}nuevo${UB}`, 'g'), 'new');
    body = body.replace(new RegExp(`${PUB}funcion${UB}`, 'g'), 'function');
    body = body.replace(new RegExp(`${PUB}verdadero${UB}`, 'g'), 'true');
    body = body.replace(new RegExp(`${PUB}falso${UB}`, 'g'), 'false');
    body = body.replace(new RegExp(`${PUB}variable${UB}`, 'g'), 'let');
    body = body.replace(new RegExp(`${PUB}constante${UB}`, 'g'), 'const');

    // Portuguese
    body = body.replace(new RegExp(`${PUB}se\\s*\\(`, 'g'), 'if (');
    body = body.replace(new RegExp(`${PUB}senão${UB}`, 'g'), 'else');
    body = body.replace(new RegExp(`${PUB}enquanto\\s*\\(`, 'g'), 'while (');
    body = body.replace(new RegExp(`${PUB}para${UB}\\s*\\(`, 'g'), 'for (');
    body = body.replace(new RegExp(`${PUB}função${UB}`, 'g'), 'function');
    body = body.replace(new RegExp(`${PUB}verdadeiro${UB}`, 'g'), 'true');
    body = body.replace(new RegExp(`${PUB}falso${UB}`, 'g'), 'false');

    // Russian
    body = body.replace(new RegExp(`${PUB}если\\s*\\(`, 'g'), 'if (');
    body = body.replace(new RegExp(`${PUB}иначе${UB}`, 'g'), 'else');
    body = body.replace(new RegExp(`${PUB}пока\\s*\\(`, 'g'), 'while (');
    body = body.replace(new RegExp(`${PUB}для${UB}\\s*\\(`, 'g'), 'for (');
    body = body.replace(new RegExp(`${PUB}вернуть${UB}`, 'g'), 'return');
    body = body.replace(new RegExp(`${PUB}новый${UB}`, 'g'), 'new');
    body = body.replace(new RegExp(`${PUB}функция${UB}`, 'g'), 'function');
    body = body.replace(new RegExp(`${PUB}истина${UB}`, 'g'), 'true');
    body = body.replace(new RegExp(`${PUB}ложь${UB}`, 'g'), 'false');

    // Chinese
    body = body.replace(new RegExp(`${PUB}如果\\s*\\(`, 'g'), 'if (');
    body = body.replace(new RegExp(`${PUB}否则${UB}`, 'g'), 'else');
    body = body.replace(new RegExp(`${PUB}当\\s*\\(`, 'g'), 'while (');
    body = body.replace(new RegExp(`${PUB}对于${UB}\\s*\\(`, 'g'), 'for (');
    body = body.replace(new RegExp(`${PUB}返回${UB}`, 'g'), 'return');
    body = body.replace(new RegExp(`${PUB}新建${UB}`, 'g'), 'new');
    body = body.replace(new RegExp(`${PUB}函数${UB}`, 'g'), 'function');
    body = body.replace(new RegExp(`${PUB}真${UB}`, 'g'), 'true');
    body = body.replace(new RegExp(`${PUB}假${UB}`, 'g'), 'false');

    // 2.c: Coroutines support
    body = body.replace(/(?<![.\w])(esperar|aguardar|ждать|等待)\s*\(/g, 'await this.esperar(');

    // 2.d: Simplified Prefab Syntax (crear miprefab -> await this.crear(this.miprefab))
    // We handle this before auto-prefixing shortcuts to catch the name correctly
    body = body.replace(/(?<![\w\u00C0-\u017Fа-яА-Я一-龥])(this\.)?(crear|create|criar|создать|创建)\s+([a-zA-Z_\u00C0-\u017Fа-яА-Я一-龥][\w\u00C0-\u017Fа-яА-Я一-龥]*)(?!\s*\()/g, (match, p1, p2, p3) => {
        // Map native command to canonical create/crear
        let cmd = p2;
        if (cmd === 'criar') cmd = 'crear';
        if (cmd === 'создать') cmd = 'create';
        if (cmd === '创建') cmd = 'create';
        return `await this.${cmd}(this.${p3})`;
    });

    // 2.d.1: Handle mtr. / materia. prefix mapping to this. for shortcuts
    body = body.replace(/(?<![\w\u00C0-\u017Fа-яА-Я一-龥])(mtr|materia|matéria|материя|物质)\.([a-zA-Z_\u00C0-\u017Fа-яА-Я一-龥][\w\u00C0-\u017Fа-яА-Я一-龥]*)/g, (match, p1, p2) => {
        if (componentShortcuts.includes(p2)) {
            return `this.${p2}`;
        }
        return match;
    });

    // 2.e: Auto-prefix component shortcuts
    componentShortcuts.forEach(shortcut => {
        // Updated regex to support Unicode word boundaries for PT, RU and ZH
        const regex = new RegExp(`(?<![.\\w\\u00C0-\u017F\\u0400-\\u04FF\\u4E00-\\u9FA5])${shortcut}(?![\\w\\u00C0-\u017F\\u0400-\\u04FF\\u4E00-\\u9FA5])`, 'g');
        body = body.replace(regex, `this.${shortcut}`);
    });

    // 2.e: Replace custom library function calls
    for (const libName of importedLibs) {
        const api = RuntimeAPIManager.getAPI(libName);
        if (!api) continue;
        for (const functionName in api) {
            const regex = new RegExp(`(?<![.\\w])\\b${functionName}\\b(?=\\s*\\()`, 'g');
            const replacement = `RuntimeAPIManager.getAPI("${libName}")["${functionName}"]`;
            body = body.replace(regex, replacement);
        }
    }

    // 2.f: Auto-prefix public and private variables
    publicVars.forEach(pv => {
        const regex = new RegExp(`(?<![.\\w])\\b${pv.name}\\b`, 'g');
        body = body.replace(regex, `this.${pv.name}`);
    });
    privateVars.forEach(pv => {
        const regex = new RegExp(`(?<![.\\w])\\b${pv.name}\\b`, 'g');
        body = body.replace(regex, `this.${pv.name}`);
    });

    // 2.g: Auto-prefix custom script functions
    customFunctions.forEach(fn => {
        const regex = new RegExp(`(?<![.\\w])\\b${fn}\\b`, 'g');
        body = body.replace(regex, `this.${fn}`);
    });

    // --- Protected Block Restoration ---
    body = body.replace(/__CES_PROT_(\d+)__/g, (match, index) => {
        return protectedBlocks[parseInt(index)];
    });

    return body;
}

/**
 * Transpiles a .ces script into an ES6 class.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @returns {{errors: string[] | null, jsCode: string | null}} An object with an errors array, or the generated JS code.
 */
export function transpile(code, scriptName = 'unnamed.ces') {
    const errors = [];
    if (!scriptName) scriptName = 'unnamed.ces';
    let className = scriptName.replace(/\.(ces|chc)$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    // Asegurar que el nombre de la clase no empiece por un número
    if (/^[0-9]/.test(className)) {
        className = 'Script_' + className;
    }

    let publicVars = [];
    let privateVars = [];
    let startMethod = '';
    let startArgs = '';
    let updateMethod = '';
    let updateArgs = '';
    let publicFunctions = [];
    const importedLibs = new Set();

    // --- Phase 1: Parse and Rip Declarations ---
    // Order of operations is important here to avoid regex conflicts.
    // 1. Rip out methods first.
    // 2. Then rip out variables.
    // 3. Finally, handle imports.

    let unprocessedCode = code;

    // 1.0: Parse and extract root-level 'cada' blocks (Simplified Timers)
    // These will be moved to the 'start' method
    const rootCadaRegex = /\bcada\s*\(([^)]+)\)\s*{/g;
    let rootCadaMatch;
    let rootCadaCode = '';

    while ((rootCadaMatch = rootCadaRegex.exec(unprocessedCode)) !== null) {
        const startIdx = rootCadaMatch.index;
        const contentStartIdx = rootCadaMatch.index + rootCadaMatch[0].length;
        let braceCount = 1;
        let endIdx = -1;

        for (let i = contentStartIdx; i < unprocessedCode.length; i++) {
            const char = unprocessedCode[i];
            const nextChar = unprocessedCode[i + 1];

            if (char === '"' || char === "'" || char === '`') {
                const quote = char;
                i++;
                while (i < unprocessedCode.length && unprocessedCode[i] !== quote) {
                    if (unprocessedCode[i] === '\\') i++;
                    i++;
                }
                continue;
            }
            if (char === '/' && nextChar === '/') {
                i += 2;
                while (i < unprocessedCode.length && unprocessedCode[i] !== '\n') i++;
                continue;
            }
            if (char === '/' && nextChar === '*') {
                i += 2;
                while (i < unprocessedCode.length && !(unprocessedCode[i] === '*' && unprocessedCode[i + 1] === '/')) i++;
                i++;
                continue;
            }

            if (char === '{') braceCount++;
            else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx !== -1) {
            const interval = rootCadaMatch[1];
            const cadaBody = unprocessedCode.substring(contentStartIdx, endIdx);
            rootCadaCode += `cada(${interval}) {${cadaBody}}\n`;

            // Remove the block from unprocessedCode
            const fullMatch = unprocessedCode.substring(startIdx, endIdx + 1);
            unprocessedCode = unprocessedCode.replace(fullMatch, '');
            rootCadaRegex.lastIndex = 0; // Restart search
        }
    }

    // 1.a: Parse and extract methods (multilingual)
    // Scope (public/private) is now optional, defaults to public
    const methodHeaderRegex = /^\s*(?:(public|publico|público|открытый|公开)\s+)?(?:async\s+)?(?:(function|funcion|função|функция|函数)\s+)?(?!(?:si|sino|se|senão|mientras|enquanto|para|cada|go|ve|если|иначе|пока|для|如果|否则|当|对于)(?![.\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FA5]))([a-zA-Z_\u00C0-\u017Fа-яА-Я一-龥][\w\u00C0-\u017Fа-яА-Я一-龥]*)\s*\(([^)]*)\)\s*{/gm;
    const methodMatches = []; // Store matches to process later
    let tempCode = unprocessedCode;
    let methodMatch;

    while ((methodMatch = methodHeaderRegex.exec(tempCode)) !== null) {
        const isFunction = methodMatch[2] === 'function' || methodMatch[2] === 'funcion';
        let name = methodMatch[3];
        const args = methodMatch[4];
        const bodyStartIndex = methodMatch.index + methodMatch[0].length;

        let braceCount = 1;
        let bodyEndIndex = -1;
        for (let i = bodyStartIndex; i < tempCode.length; i++) {
            const char = tempCode[i];
            const nextChar = tempCode[i + 1];

            // Ignorar cadenas de texto (comillas simples, dobles o backticks)
            if (char === '"' || char === "'" || char === '`') {
                const quote = char;
                i++;
                while (i < tempCode.length && tempCode[i] !== quote) {
                    if (tempCode[i] === '\\') i++; // saltar carácter escapado
                    i++;
                }
                continue;
            }

            // Ignorar comentarios de una línea
            if (char === '/' && nextChar === '/') {
                i += 2;
                while (i < tempCode.length && tempCode[i] !== '\n') i++;
                continue;
            }

            // Ignorar comentarios multilínea
            if (char === '/' && nextChar === '*') {
                i += 2;
                while (i < tempCode.length && !(tempCode[i] === '*' && tempCode[i + 1] === '/')) i++;
                i++; // saltar el asterisco
                continue;
            }

            if (char === '{') braceCount++;
            else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    bodyEndIndex = i;
                    break;
                }
            }
        }

        if (bodyEndIndex === -1) {
            errors.push(`Error: Método '${name}' no tiene una llave de cierre correspondiente.`);
            continue;
        }

        const body = tempCode.substring(bodyStartIndex, bodyEndIndex);
        const fullMethodText = tempCode.substring(methodMatch.index, bodyEndIndex + 1);

        // Add to public functions if it's not a known internal/lifecycle method
        // In this engine, public methods don't necessarily need the 'funcion' keyword
        const internalMethods = [
            'start', 'update', 'iniciar', 'alEmpezar', 'actualizar', 'alActualizar',
            'começar', 'atualizar', 'начать', 'обновить', '开始', '更新',
            'fixedUpdate', 'actualizarFijo', 'onEnable', 'onDisable', 'onDestroy',
            'alEntrarEnColision', 'OnCollisionEnter', 'alPermanecerEnColision', 'OnCollisionStay', 'alSalirDeColision', 'OnCollisionExit',
            'alEntrarEnTrigger', 'OnTriggerEnter', 'alPermanecerEnTrigger', 'OnTriggerStay', 'alSalirDeTrigger', 'OnTriggerExit',
            'alFinalizarAnimacion', 'OnAnimationEnd', 'onPointerDown', 'alPresionar', 'onPointerUp', 'alSoltar',
            'onPointerEnter', 'alEntrar', 'onPointerExit', 'alSalir', 'onPointerClick', 'alHacerClick',
            'onPointerDrag', 'alDeslizar', 'onPointerHold', 'alMantener', 'alHabilitar', 'activar', 'alDeshabilitar', 'desactivar', 'alDestruir'
        ];
        if (!internalMethods.includes(name)) {
            publicFunctions.push(name);
        }

        methodMatches.push({ name, args, body });

        // Blank out the matched method to prevent it from being processed again
        unprocessedCode = unprocessedCode.replace(fullMethodText, '');
    }


    // 1.b: Parse and validate library imports. (Handled before variables to avoid conflicts)
    // Supports: go, ve, engine (EN), motor (PT), двигатель (RU), 引擎 (ZH)
    const goRegex = /^\s*(?:go|ve|engine|motor|двигатель|引擎)\s+(?:"([^"]+)"|((?:ce\.)?[\w.]+))\s*;?/gm;
    let goMatch;
    while ((goMatch = goRegex.exec(unprocessedCode)) !== null) {
        const libName = goMatch[1] || goMatch[2];
        if (libName.startsWith('engine') || libName.startsWith('motor') || RuntimeAPIManager.getAPI(libName)) {
            importedLibs.add(libName);
        } else {
            errors.push(`Error: La librería '${libName}' no se encontró o no está registrada.`);
        }
    }
    unprocessedCode = unprocessedCode.replace(goRegex, '');


    // 1.c: Parse and remove public and private variables (multilingual with new syntax)
    // Scope is optional, defaults to public
    const varRegex = /^\s*(?:(public|private|publico|privado|público|открытый|закрытый|公开|私有)\s+)?(?!(?:si|sino|se|senão|mientras|enquanto|para|cada|go|ve|engine|motor|двигатель|引擎|если|иначе|пока|для|如果|否则|当|对于|crear|create|criar|создать|创建|esperar|aguardar|ждать|等待)(?![.\w\u00C0-\u017F\u0400-\u04FF\u4E00-\u9FA5]))([a-zA-Z_\u00C0-\u017Fа-яА-Я一-龥][\w\u00C0-\u017Fа-яА-Я一-龥]*)\s+([a-zA-Z_\u00C0-\u017Fа-яА-Я一-龥][\w\u00C0-\u017Fа-яА-Я一-龥]*)\s*(?:=\s*(.+))?;/gm;
    let varMatch;
    while ((varMatch = varRegex.exec(unprocessedCode)) !== null) {
        const scopeMatch = varMatch[1] || 'public';
        const scope = scopeMatch.replace(/publico|público|открытый|公开/, 'public').replace(/privado|закрытый|私有/, 'private');
        const typeInput = varMatch[2];
        const name = varMatch[3];
        const value = varMatch[4];

        const canonicalType = typeMap[typeInput];
        if (!canonicalType) {
            errors.push(`Error: Tipo de variable desconocido '${typeInput}' en la declaración de '${name}'.`);
            continue;
        }

        const parsedValue = value ? parseInitialValue(value.trim(), canonicalType) : getDefaultValueForType(canonicalType);

        if (scope === 'public') {
            publicVars.push({ type: canonicalType, name: name, value: value, defaultValue: parsedValue });
        } else {
            privateVars.push({ name: name, value: value });
        }
    }
    unprocessedCode = unprocessedCode.replace(varRegex, '');


    // Almacenar los metadatos de las variables públicas
    const metadata = {
        publicVars: publicVars.map(pv => ({ name: pv.name, type: pv.type, defaultValue: pv.defaultValue })),
        publicFunctions: publicFunctions
    };
    scriptMetadataMap.set(scriptName, metadata);


    const customFunctions = methodMatches.map(m => m.name);

    // Transpile the rootCadaCode block
    if (rootCadaCode) {
        rootCadaCode = transpileBlock(rootCadaCode, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager, customFunctions);
    }

    // --- Phase 2: Transpile method bodies ---
    for (const match of methodMatches) {
        let { name, args, body } = match;

        body = transpileBlock(body, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager, customFunctions);

        // 2.g: Map multilingual lifecycle methods to their English counterparts
        if (name === 'iniciar' || name === 'alEmpezar' || name === 'começar' || name === 'начать' || name === '开始') name = 'start';
        if (name === 'actualizar' || name === 'alActualizar' || name === 'atualizar' || name === 'обновить' || name === '更新') name = 'update';

        if (name === 'start') {
            startMethod = body + '\n' + (rootCadaCode || '');
            startArgs = args;
        } else if (name === 'update') {
            updateMethod = body;
            updateArgs = args;
        }

        match.name = name;
        match.body = body;
    }

    // If we have rootCadaCode but no start method was found, create an empty one to house it
    if (rootCadaCode && !startMethod) {
        startMethod = rootCadaCode;
    }

    // 1.d: Final check for leftover code
    unprocessedCode = unprocessedCode.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    if (unprocessedCode.trim() !== '') {
        const firstInvalidLine = unprocessedCode.trim().split('\n')[0];
        errors.push(`Error: Código inválido encontrado fuera de una declaración: "${firstInvalidLine}..."`);
    }

    if (errors.length > 0) {
        transpiledCodeMap.delete(scriptName);
        scriptMetadataMap.delete(scriptName); // Limpiar metadatos en caso de error
        return { errors, jsCode: null };
    }

    // --- Phase 3: Build the JavaScript class ---
    let jsCode = `(function(CreativeScriptBehavior, RuntimeAPIManager) {\n`;
    jsCode += `    class ${className} extends CreativeScriptBehavior {\n`;
    jsCode += `        constructor(materia) {\n            super(materia);\n`;
    publicVars.forEach(pv => {
        let val = pv.value ? transpileBlock(pv.value, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager, customFunctions) : JSON.stringify(pv.defaultValue);
        // Replace Spanish booleans in default values (fallback for non-transpiled parts)
        val = val.replace(/\bverdadero\b/g, 'true').replace(/\bfalso\b/g, 'false');
        jsCode += `            this.${pv.name} = ${val}; // Type: ${pv.type}\n`;
    });
    privateVars.forEach(pv => {
        let val = pv.value ? transpileBlock(pv.value, componentShortcuts, publicVars, privateVars, importedLibs, RuntimeAPIManager, customFunctions) : 'null';
        val = val.replace(/\bverdadero\b/g, 'true').replace(/\bfalso\b/g, 'false');
        jsCode += `            this.${pv.name} = ${val};\n`;
    });
    jsCode += `        }\n\n`;

    const indentBody = (body) => body ? body.trim().split('\n').map(line => `            ${line.trim()}`).join('\n') : '';

    jsCode += `        async start(${startArgs}) {\n${indentBody(startMethod)}\n        }\n\n`;
    jsCode += `        async update(${updateArgs || 'deltaTime'}) {\n${indentBody(updateMethod)}\n        }\n\n`;

    // Process custom methods to be async too
    const processedCustomMethods = methodMatches
        .filter(m => m.name !== 'start' && m.name !== 'update')
        .map(m => `        async ${m.name}(${m.args}) {\n${indentBody(m.body)}\n        }\n`)
        .join('\n');

    jsCode += `${processedCustomMethods}\n`;

    jsCode += `    }\n\n    return ${className};\n});`;

    transpiledCodeMap.set(scriptName, jsCode);
    return { errors: null, jsCode };
}

/**
 * Retrieves the transpiled JavaScript code for a given script.
 * @param {string} scriptName The name of the script file (e.g., 'PlayerController.ces').
 * @returns {string | undefined} The transpiled code, or undefined if not found.
 */
export function getTranspiledCode(scriptName) {
    return transpiledCodeMap.get(scriptName);
}

export function getAllTranspiledCode() {
    return Object.fromEntries(transpiledCodeMap);
}

export function getAllMetadata() {
    return Object.fromEntries(scriptMetadataMap);
}
