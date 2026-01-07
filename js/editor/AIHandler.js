/**
 * AIHandler.js
 *
 * Este módulo centraliza la comunicación con las APIs de IA externas (Gemini, OpenAI, etc.).
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1';

/**
 * Obtiene la lista de modelos de IA disponibles para una API key.
 * @param {string} apiKey - La clave de API.
 * @returns {Promise<{success: boolean, models?: any[], error?: string}>}
 */
export async function listModels(apiKey) {
    const endpoint = `${API_BASE}/models?key=${apiKey}`;
    try {
        const response = await fetch(endpoint);
        const data = await response.json();
        if (!response.ok || data.error) {
            const errorMessage = data.error?.message || `Error HTTP: ${response.status}`;
            return { success: false, error: `No se pudo listar los modelos: ${errorMessage}` };
        }
        return { success: true, models: data.models };
    } catch (error) {
        console.error('Fallo al listar modelos de IA:', error);
        return { success: false, error: `No se pudo conectar con el servicio de IA. Revisa tu conexión a internet. (${error.message})` };
    }
}

/**
 * Llama a la API de IA generativa seleccionada.
 * @param {string} modelName - El nombre completo del modelo (ej. 'models/gemini-1.5-flash').
 * @param {string} apiKey - La clave de API para el proveedor.
 * @param {string} prompt - El mensaje a enviar a la IA.
 * @returns {Promise<{success: boolean, text?: string, error?: string, code?: number | string}>} - Un objeto con el resultado.
 */
export async function callGenerativeAI(modelName, apiKey, prompt) {
    if (!modelName) {
        return { success: false, error: "No se ha especificado un nombre de modelo para la llamada a la API.", code: 400 };
    }

    const endpoint = `${API_BASE}/${modelName}:generateContent?key=${apiKey}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: prompt
            }]
        }]
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('Error de la API de IA:', data.error);
            const errorMessage = data.error?.message || `Error HTTP: ${response.status}`;
            return { success: false, error: `Error de la API: ${errorMessage}`, code: data.error?.code || response.status };
        }

        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textResponse) {
            return { success: true, text: textResponse };
        } else {
            return { success: false, error: "No se pudo extraer una respuesta válida de la API." };
        }

    } catch (error) {
        console.error('Fallo en la llamada a la API de IA:', error);
        return { success: false, error: `No se pudo conectar con el servicio de IA. Revisa tu conexión a internet. (${error.message})` };
    }
}