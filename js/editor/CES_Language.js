import { StreamLanguage, tags } from "./CodeMirrorBundle.js";

const cesKeywords = [
    "si", "sino", "mientras", "para", "cada", "esperar", "retornar", "nuevo",
    "funcion", "variable", "constante", "verdadero", "falso", "publico", "privado",
    "ve", "go", "public", "private", "async", "await",
    "se", "senão", "enquanto", "função", "если", "иначе", "пока", "для",
    "вернуть", "новый", "функция", "истина", "ложь", "如果", "否则", "当",
    "对于", "返回", "新建", "函数", "真", "假"
];

const cesTypes = [
    "number", "numero", "número", "text", "texto", "boolean", "booleano",
    "Vector2", "Color", "Materia", "mtr", "Prefab", "prefab", "Scene", "escena",
    "Audio", "audio", "Sprite", "sprite", "Tag", "Layer", "Video", "pelicula",
    "Transform", "UITransform", "SpriteRenderer", "Rigidbody2D",
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
    token(stream) {
        if (stream.eatSpace()) return null;

        // Comments
        if (stream.match("//")) {
            stream.skipToEnd();
            return tags.lineComment;
        }
        if (stream.match("/*")) {
            while (!stream.eof()) {
                if (stream.match("*/")) break;
                stream.next();
            }
            return tags.blockComment;
        }

        // Strings
        if (stream.match(/"(?:[^\\]|\\.)*?"/) || stream.match(/'(?:[^\\]|\\.)*?'/)) {
            return tags.string;
        }

        // Numbers
        if (stream.match(/\d+(?:\.\d+)?/)) {
            return tags.number;
        }

        // Punctuation
        if (stream.match(/[(){}\[\];,.]/)) {
            return tags.punctuation;
        }

        // Operators
        if (stream.match(/[+\-*/%=<>!&|^~]/)) {
            return tags.operator;
        }

        // Keywords, Types, Builtins, Functions
        const wordMatch = stream.match(/[a-zA-Z_\u00C0-\u017Fа-яА-Я一-龥][\w\u00C0-\u017Fа-яА-Я一-龥]*/);
        if (wordMatch) {
            const word = wordMatch[0];
            if (cesKeywords.includes(word)) return tags.keyword;
            if (cesTypes.includes(word)) return tags.typeName;
            if (cesBuiltins.includes(word)) return tags.builtin;
            if (cesFunctions.includes(word)) return tags.function(tags.variableName);
            return tags.variableName;
        }

        stream.next();
        return null;
    }
});

export { cesLanguage };
