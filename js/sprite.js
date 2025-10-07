/**
 * Almacena los datos de un único sprite recortado de una hoja de sprites.
 * Es el análogo a la estructura SpriteMetaData de Unity.
 */
export class SpriteData {
    /**
     * @param {string} name - El nombre identificador del sprite.
     * @param {number} x - La coordenada X del rectángulo de recorte en la textura.
     * @param {number} y - La coordenada Y del rectángulo de recorte en la textura.
     * @param {number} width - El ancho del rectángulo de recorte.
     * @param {number} height - La altura del rectángulo de recorte.
     */
    constructor(name, x, y, width, height) {
        this.name = name;
        this.rect = { x, y, width, height };

        // Pivote (normalizado de 0.0 a 1.0). (0.5, 0.5) es el centro.
        this.pivot = { x: 0.5, y: 0.5 };

        // Bordes para 9-slicing (en píxeles).
        this.border = { left: 0, top: 0, right: 0, bottom: 0 };
    }
}

/**
 * Representa una hoja de sprites completa, que es una textura
 * junto con la definición de todos los sprites individuales que contiene.
 */
export class SpriteSheet {
    /**
     * @param {string} texturePath - La ruta a la imagen de la hoja de sprites.
     */
    constructor(texturePath) {
        this.texturePath = texturePath;
        /** @type {Object.<string, SpriteData>} */
        this.sprites = {}; // For ungrouped, manually added sprites
        /** @type {Object.<string, {name: string, rect: object, sprites: Object.<string, SpriteData>}>} */
        this.groups = {}; // For grouped sprites from auto-slicing
    }

    /**
     * Añade un nuevo sprite a la hoja, opcionalmente dentro de un grupo.
     * @param {SpriteData} spriteData - La instancia de SpriteData a añadir.
     * @param {string|null} groupName - El nombre del grupo al que pertenece el sprite.
     */
    addSprite(spriteData, groupName = null) {
        if (groupName) {
            if (!this.groups[groupName]) {
                // This shouldn't happen if addGroup is called first, but as a fallback:
                this.addGroup(groupName, spriteData.rect); // Use first sprite's rect as a guess
            }
            this.groups[groupName].sprites[spriteData.name] = spriteData;
        } else {
            this.sprites[spriteData.name] = spriteData;
        }
    }

    /**
     * Obtiene los datos de un sprite por su nombre, buscando en todos los grupos.
     * @param {string} name - El nombre del sprite a buscar.
     * @returns {SpriteData | undefined}
     */
    getSprite(name) {
        if (this.sprites[name]) {
            return this.sprites[name];
        }
        for (const groupName in this.groups) {
            if (this.groups[groupName].sprites[name]) {
                return this.groups[groupName].sprites[name];
            }
        }
        return undefined;
    }

    /**
     * Añade un nuevo grupo a la hoja de sprites.
     * @param {string} name - El nombre del grupo (ej. "island_0").
     * @param {object} rect - El rectángulo que define los límites del grupo.
     */
    addGroup(name, rect) {
        if (!this.groups[name]) {
            this.groups[name] = {
                name: name,
                rect: rect,
                sprites: {}
            };
        }
    }

    /**
     * Limpia todos los sprites y grupos de la hoja.
     */
    clear() {
        this.sprites = {};
        this.groups = {};
    }

    /**
     * Elimina un sprite de la hoja por su nombre, buscando en todos los grupos.
     * @param {string} name - El nombre del sprite a eliminar.
     */
    removeSprite(name) {
        if (this.sprites[name]) {
            delete this.sprites[name];
            return;
        }
        for (const groupName in this.groups) {
            if (this.groups[groupName].sprites[name]) {
                delete this.groups[groupName].sprites[name];
                return;
            }
        }
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

        // Handle legacy format and ungrouped sprites
        if (data.sprites) {
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
        }

        // Handle new grouped format
        if (data.groups) {
            for (const groupName in data.groups) {
                const groupData = data.groups[groupName];
                sheet.addGroup(groupData.name, groupData.rect);
                for (const spriteName in groupData.sprites) {
                    const spriteData = groupData.sprites[spriteName];
                    const newSprite = new SpriteData(
                        spriteData.name,
                        spriteData.rect.x,
                        spriteData.rect.y,
                        spriteData.rect.width,
                        spriteData.rect.height
                    );
                    newSprite.pivot = spriteData.pivot;
                    newSprite.border = spriteData.border;
                    sheet.addSprite(newSprite, groupName);
                }
            }
        }

        return sheet;
    }
}