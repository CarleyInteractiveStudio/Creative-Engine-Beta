/**
 * Almacena los datos de un unico sprite recortado de una hoja de sprites.
 * Es el analogo a la estructura SpriteMetaData de Unity.
 */
export class SpriteData {
    /**
     * @param {string} name - El nombre identificador del sprite.
     * @param {number} x - La coordenada X del rectangulo de recorte en la textura.
     * @param {number} y - La coordenada Y del rectangulo de recorte en la textura.
     * @param {number} width - El ancho del rectangulo de recorte.
     * @param {number} height - La altura del rectangulo de recorte.
     */
    constructor(name, x, y, width, height) {
        this.name = name;
        this.rect = { x, y, width, height };

        // Pivote (normalizado de 0.0 a 1.0). (0.5, 0.5) es el centro.
        this.pivot = { x: 0.5, y: 0.5 };

        // Bordes para 9-slicing (en pixeles).
        this.border = { left: 0, top: 0, right: 0, bottom: 0 };
    }
}

/**
 * Representa una hoja de sprites completa, que es una textura
 * junto con la definicion de todos los sprites individuales que contiene.
 */
export class SpriteSheet {
    /**
     * @param {string} texturePath - La ruta a la imagen de la hoja de sprites.
     */
    constructor(texturePath) {
        this.texturePath = texturePath;
        /** @type {Object.<string, SpriteData>} */
        this.sprites = {};
    }

    /**
     * Anade un nuevo sprite a la hoja.
     * @param {SpriteData} spriteData - La instancia de SpriteData a anadir.
     */
    addSprite(spriteData) {
        this.sprites[spriteData.name] = spriteData;
    }

    /**
     * Obtiene los datos de un sprite por su nombre.
     * @param {string} name - El nombre del sprite a buscar.
     * @returns {SpriteData | undefined}
     */
    getSprite(name) {
        return this.sprites[name];
    }

    /**
     * Elimina un sprite de la hoja por su nombre.
     * @param {string} name - El nombre del sprite a eliminar.
     */
    removeSprite(name) {
        delete this.sprites[name];
    }

    /**
     * Serializa la hoja de sprites a una cadena JSON.
     * @returns {string}
     */
    toJson() {
        // Usamos null, 2 para formatear el JSON de forma legible.
        return JSON.stringify(this, null, 2);
    }

    /**
     * Deserializa una cadena JSON para crear una instancia de SpriteSheet.
     * @param {string} jsonString - La cadena JSON a parsear.
     * @returns {SpriteSheet}
     */
    static fromJson(jsonString) {
        const data = JSON.parse(jsonString);
        const sheet = new SpriteSheet(data.texturePath);

        for (const spriteName in data.sprites) {
            const spriteData = data.sprites[spriteName];
            const newSprite = new SpriteData(
                spriteData.name,
                spriteData.rect.x,
                spriteData.rect.y,
                spriteData.rect.width,
                spriteData.rect.height
            );
            newSprite.pivot = spriteData.pivot;
            newSprite.border = spriteData.border;
            sheet.addSprite(newSprite);
        }
        return sheet;
    }
}