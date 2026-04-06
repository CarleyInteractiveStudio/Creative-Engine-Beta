import { StreamLanguage, tags, foldNodeProp } from "./CodeMirrorBundle.js";

// Utility to ensure we don't pass undefined tags
const getTag = (name) => {
    const tag = tags[name];
    if (!tag) {
        console.warn(`Tag "${name}" not found in CodeMirror tags, falling back to variableName`);
        return tags.variableName;
    }
    return tag;
};

const cesKeywords = [
    "si", "sino", "mientras", "para", "cada", "esperar", "retornar", "nuevo",
    "funcion", "variable", "constante", "verdadero", "falso", "publico", "privado",
    "bublico", "bublica", "piblico", "piblica",
    "ve", "go", "public", "private", "async", "await",
    "se", "senão", "enquanto", "função", "если", "иначе", "пока", "для",
    "вернуть", "nuevo", "функция", "истина", "ложь", "如果", "否则", "当",
    "对于", "返回", "新建", "函数", "真", "假"
];

const cesTypes = [
    "number", "numero", "número", "text", "texto", "boolean", "booleano",
    "Vector2", "Color", "Materia", "mtr", "Prefab", "prefab", "Scene", "escena",
    "Audio", "audio", "Sprite", "sprite", "Tag", "Layer", "Video", "pelicula",
    "Transform", "posicion", "UITransform", "SpriteRenderer", "Rigidbody2D",
    "BoxCollider2D", "CapsuleCollider2D", "Animator", "AnimatorController",
    "Camera", "CreativeScript", "PointLight2D", "SpotLight2D", "FreeformLight2D",
    "SpriteLight2D", "Tilemap", "TilemapRenderer", "TilemapCollider2D", "UIImage",
    "UIText", "Canvas", "Button", "UIEventTrigger", "Parallax", "Movement",
    "Water", "LineCollider2D", "ParticleSystem", "DrawingOrder", "CameraFollow",
    "VerticalLayoutGroup", "HorizontalLayoutGroup", "GridLayoutGroup", "ContentSizeFitter",
    "Health", "Attack", "ProgressBar", "any"
];

const cesBuiltins = [
    "transform", "transformacion", "posicion", "rigidbody2D", "fisica",
    "animatorController", "controladorAnimacion", "spriteRenderer", "renderizadorDeSprite",
    "audioSource", "fuenteDeAudio", "boxCollider2D", "colisionadorCaja2D",
    "capsuleCollider2D", "colisionadorCapsula2D", "camera", "camara",
    "animator", "animador", "tilemap", "grid", "rejilla", "raycastSource",
    "rallo", "basicAI", "iaBasica", "canvas", "ui", "boton", "imagen", "textoUI",
    "materia", "mtr", "motor", "engine", "entrada", "input", "escena", "scene",
    "nombre", "tag", "delta", "deltaTime", "otro", "datos"
];

const cesFunctions = [
    "iniciar", "alEmpezar", "start", "actualizar", "alActualizar", "update",
    "reproducir", "play", "detener", "stop", "crear", "create", "destruir", "destroy",
    "instanciar", "instantiate", "buscar", "find", "obtenerScript", "getScript",
    "obtenerComponente", "getComponent", "alEntrarEnColision", "getCollisionEnter",
    "estaTocandoTag", "isTouchingTag", "azar", "random", "distancia", "distance",
    "redondear", "round", "limitar", "clamp", "imprimir", "log"
];

const cesLanguage = StreamLanguage.define({
    languageData: {
        commentTokens: { line: "//", block: { open: "/*", close: "*/" } },
        indentOnInput: /^\s*[}\]]$/
    },
    token(stream) {
        if (stream.eatSpace()) return null;

        // Comments
        if (stream.match("//")) {
            stream.skipToEnd();
            return "comment";
        }
        if (stream.match("/*")) {
            while (!stream.eof()) {
                if (stream.match("*/")) break;
                stream.next();
            }
            return "comment";
        }

        // Strings
        if (stream.match(/"(?:[^\\]|\\.)*?"/) || stream.match(/'(?:[^\\]|\\.)*?'/)) {
            return "string";
        }

        // Numbers
        if (stream.match(/\d+(?:\.\d+)?/)) {
            return "number";
        }

        // Punctuation
        if (stream.match(/[(){}\[\];,.]/)) {
            return "punctuation";
        }

        // Operators
        if (stream.match(/[+\-*/%=<>!&|^~]/)) {
            return "operator";
        }

        // Keywords, Types, Builtins, Functions
        const wordMatch = stream.match(/[a-zA-Z_\u00C0-\u017Fа-яА-Я一-龥][\w\u00C0-\u017Fа-яА-Я一-龥]*/);
        if (wordMatch) {
            const word = wordMatch[0];
            if (cesKeywords.includes(word)) return "keyword";
            if (cesTypes.includes(word)) return "typeName";
            if (cesBuiltins.includes(word)) return "propertyName";
            if (cesFunctions.includes(word)) return "functionName";
            return "variableName";
        }

        stream.next();
        return null;
    },
    tokenTable: {
        comment: getTag("comment"),
        string: getTag("string"),
        number: getTag("number"),
        punctuation: getTag("punctuation"),
        operator: getTag("operator"),
        keyword: getTag("keyword"),
        typeName: getTag("typeName"),
        propertyName: getTag("propertyName"),
        functionName: tags.function ? tags.function(tags.variableName) : getTag("variableName"),
        variableName: getTag("variableName")
    }
});

export { cesLanguage };
