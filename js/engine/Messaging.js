// js/engine/Messaging.js

class MessageBus {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Suscribe un callback a un mensaje específico.
     * @param {string} message - Nombre del mensaje.
     * @param {Function} callback - Función a ejecutar.
     * @returns {Function} Función para desuscribirse.
     */
    subscribe(message, callback) {
        if (!this.listeners.has(message)) {
            this.listeners.set(message, new Set());
        }
        this.listeners.get(message).add(callback);
        return () => this.unsubscribe(message, callback);
    }

    unsubscribe(message, callback) {
        if (this.listeners.has(message)) {
            this.listeners.get(message).delete(callback);
        }
    }

    /**
     * Envía un mensaje a todos los suscriptores.
     * @param {string} message - Nombre del mensaje.
     * @param {any} data - Datos opcionales.
     */
    broadcast(message, data) {
        if (this.listeners.has(message)) {
            this.listeners.get(message).forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error al procesar mensaje '${message}':`, e);
                }
            });
        }
    }
}

export const bus = new MessageBus();
