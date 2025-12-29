/**
 * prototipos-ui.js
 *
 * Este archivo contiene prototipos de código y esqueletos de clases para el nuevo
 * sistema de UI de Creative Engine. No está destinado a ser funcional, sino a
 * servir como una guía técnica clara para la implementación real en los
 * archivos del motor correspondientes (por ejemplo, js/engine/Components.js).
 */

// Se asume que existe una clase base 'Component' de la cual todos los componentes heredan.
class Component {
    constructor() {
        this.materia = null; // Referencia a la Materia a la que está adjunto.
    }
}

// -----------------------------------------------------------------------------
// 1. Componente Canvas
// -----------------------------------------------------------------------------

/**
 * Componente raíz para toda la jerarquía de UI. Marca a sus hijos para ser
 * renderizados en un pase de UI específico.
 */
class Canvas extends Component {
    constructor() {
        super();

        /**
         * Determina cómo se renderiza la UI.
         * - 'Screen Space': Se renderiza superpuesto a la pantalla, ignorando la cámara del juego.
         * - 'World Space': Se renderiza como un objeto normal en la escena del juego.
         * @type {'Screen Space'|'World Space'}
         */
        this.renderMode = 'Screen Space';
    }

    clone() {
        const newCanvas = new Canvas();
        newCanvas.renderMode = this.renderMode;
        return newCanvas;
    }
}

// -----------------------------------------------------------------------------
// 2. Componente RectTransform
// -----------------------------------------------------------------------------

/**
 * Componente de transformación para todos los elementos de la UI.
 * Reemplaza al componente 'Transform' estándar cuando un objeto está
 * dentro de un Canvas.
 */
class RectTransform extends Component {
    constructor() {
        super();

        // --- Propiedades Clave ---

        /**
         * Anclas: Definen cómo el rectángulo se estira o se ancla a su padre.
         * Los valores van de 0 a 1 (0,0 es abajo a la izquierda, 1,1 es arriba a la derecha).
         * @type {{ min: { x: number, y: number }, max: { x: number, y: number } }}
         */
        this.anchors = {
            min: { x: 0.5, y: 0.5 },
            max: { x: 0.5, y: 0.5 }
        };

        /**
         * Pivote: El punto (normalizado, de 0 a 1) sobre el cual el RectTransform
         * rota y escala. (0.5, 0.5) es el centro.
         * @type {{ x: number, y: number }}
         */
        this.pivot = { x: 0.5, y: 0.5 };

        /**
         * Posición del pivote relativa a los puntos de anclaje.
         * @type {{ x: number, y: number, z: number }}
         */
        this.localPosition = { x: 0, y: 0, z: 0 };

        /**
         * El tamaño del rectángulo.
         * @type {{ width: number, height: number }}
         */
        this.size = { width: 100, height: 100 };

        /**
         * Rotación en grados Euler.
         * @type {{ x: number, y: number, z: number }}
         */
        this.localRotation = { x: 0, y: 0, z: 0 };

        /**
         * Escala del RectTransform.
         * @type {{ x: number, y: number, z: number }}
         */
        this.localScale = { x: 1, y: 1, z: 1 };
    }

    /**
     * Calcula las cuatro esquinas del rectángulo en el espacio del mundo.
     * Esta función sería crucial para los gizmos del editor.
     * @returns {Array<{x: number, y: number}>} - Un array de 4 puntos.
     */
    getWorldCorners() {
        // Lógica de implementación real requeriría transformar los puntos locales
        // (basados en el tamaño y el pivote) por la matriz del mundo del objeto.
        console.warn("RectTransform.getWorldCorners() no está implementado en este prototipo.");
        return [{x:0,y:0}, {x:1,y:0}, {x:1,y:1}, {x:0,y:1}];
    }

    clone() {
        const newRect = new RectTransform();
        newRect.anchors = JSON.parse(JSON.stringify(this.anchors));
        newRect.pivot = { ...this.pivot };
        newRect.localPosition = { ...this.localPosition };
        newRect.size = { ...this.size };
        newRect.localRotation = { ...this.localRotation };
        newRect.localScale = { ...this.localScale };
        return newRect;
    }
}

// -----------------------------------------------------------------------------
// 3. Componente UIImage
// -----------------------------------------------------------------------------

/**
 * Componente para renderizar una imagen/sprite en un Canvas.
 * Es el análogo a 'SpriteRenderer' para el sistema de UI.
 */
class UIImage extends Component {
    constructor() {
        super();

        /**
         * La ruta al asset de la imagen (.png, .jpg) o a un sprite
         * dentro de un archivo .ceSprite.
         * @type {string|null}
         */
        this.sourceImage = null;

        /**
         * Un color de tinte que se multiplicará por la textura de la imagen.
         * @type {{ r: number, g: number, b: number, a: number }} - Valores de 0 a 255.
         */
        this.color = { r: 255, g: 255, b: 255, a: 255 };
    }

    clone() {
        const newImage = new UIImage();
        newImage.sourceImage = this.sourceImage;
        newImage.color = { ...this.color };
        return newImage;
    }
}

console.log("Prototipos de componentes de UI cargados.");
