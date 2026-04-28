/**
 * AIHandler.js
 *
 * Este módulo centraliza la comunicación con las APIs de IA externas (Gemini, OpenAI, etc.).
 */

/**
 * Obtiene la lista de modelos de IA disponibles para una API key y proveedor.
 * @param {string} provider - El proveedor ('gemini', 'openai', 'anthropic').
 * @param {string} apiKey - La clave de API.
 * @returns {Promise<{success: boolean, models?: any[], error?: string}>}
 */
export async function listModels(provider, apiKey) {
    let endpoint = '';
    let headers = {};

    if (provider === 'gemini') {
        endpoint = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
    } else if (provider === 'openai') {
        endpoint = 'https://api.openai.com/v1/models';
        headers = { 'Authorization': `Bearer ${apiKey}` };
    } else if (provider === 'anthropic') {
        endpoint = 'https://api.anthropic.com/v1/models';
        headers = {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
        };
    } else if (provider === 'huggingface') {
        // Para Hugging Face Custom Space, no solemos listar modelos dinámicamente
        return { success: true, models: [{ id: 'hf-custom-space', name: 'Hugging Face Custom Space' }] };
    } else {
        return { success: false, error: 'Proveedor no soportado.' };
    }

    try {
        const response = await fetch(endpoint, { headers });
        const data = await response.json();

        if (!response.ok || data.error) {
            let errorMessage = '';
            if (provider === 'gemini') errorMessage = data.error?.message;
            else if (provider === 'openai') errorMessage = data.error?.message;
            else if (provider === 'anthropic') errorMessage = data.error?.message || data.message;

            errorMessage = errorMessage || `Error HTTP: ${response.status}`;
            return { success: false, error: `No se pudo listar los modelos: ${errorMessage}` };
        }

        let models = [];
        if (provider === 'gemini') {
            models = data.models.map(m => ({
                id: m.name,
                name: m.displayName || m.name,
                supportedGenerationMethods: m.supportedGenerationMethods
            }));
        } else if (provider === 'openai') {
            models = data.data.map(m => ({ id: m.id, name: m.id }));
        } else if (provider === 'anthropic') {
            models = data.data.map(m => ({ id: m.id, name: m.display_name || m.id }));
        }

        return { success: true, models };
    } catch (error) {
        console.error('Fallo al listar modelos de IA:', error);
        return { success: false, error: `No se pudo conectar con el servicio de IA. (${error.message})` };
    }
}

/**
 * Llama a la API de IA generativa seleccionada.
 * @param {string} provider - El proveedor ('gemini', 'openai', 'anthropic').
 * @param {string} modelName - El nombre completo del modelo.
 * @param {string} apiKey - La clave de API para el proveedor.
 * @param {string} prompt - El mensaje a enviar a la IA.
 * @param {string} [systemPrompt=""] - Instrucciones de sistema opcionales para definir la personalidad.
 * @param {any[]} [history=[]] - Historial de chat previo.
 * @returns {Promise<{success: boolean, text?: string, error?: string, code?: number | string}>} - Un objeto con el resultado.
 */
export async function callGenerativeAI(provider, modelName, apiKey, prompt, systemPrompt = "", history = []) {
    if (!modelName) {
        return { success: false, error: "No se ha especificado un nombre de modelo.", code: 400 };
    }

    let endpoint = '';
    let headers = { 'Content-Type': 'application/json' };
    let body = {};

    if (provider === 'huggingface') {
        // Normalizar URL de Hugging Face Space si es necesario
        // De: https://huggingface.co/spaces/user/name -> https://user-name.hf.space
        let normalizedUrl = modelName;
        if (normalizedUrl.includes('huggingface.co/spaces/')) {
            const parts = normalizedUrl.split('huggingface.co/spaces/')[1].split('/');
            if (parts.length >= 2) {
                const user = parts[0].toLowerCase();
                const name = parts[1].toLowerCase();
                normalizedUrl = `https://${user}-${name}.hf.space`;
            }
        }

        // El modelName en este caso será la URL del Space de Hugging Face
        endpoint = normalizedUrl.endsWith('/generate') ? normalizedUrl : `${normalizedUrl}/generate`;
        body = {
            prompt: prompt,
            system_prompt: systemPrompt,
            history: history
        };
    } else if (provider === 'gemini') {
        endpoint = `https://generativelanguage.googleapis.com/v1beta/${modelName}:generateContent?key=${apiKey}`;
        const isGemini15 = modelName.includes('1.5');

        const contents = history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }));

        if (systemPrompt && isGemini15) {
            body.system_instruction = { parts: [{ text: systemPrompt }] };
        } else if (systemPrompt) {
            prompt = `[SYSTEM INSTRUCTION: ${systemPrompt}]\n\nUSER MESSAGE: ${prompt}`;
        }

        contents.push({ role: 'user', parts: [{ text: prompt }] });
        body.contents = contents;

    } else if (provider === 'openai') {
        endpoint = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${apiKey}`;

        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });

        history.forEach(h => {
            messages.push({ role: h.role, content: h.content });
        });

        messages.push({ role: 'user', content: prompt });

        body = {
            model: modelName,
            messages: messages
        };
    } else if (provider === 'anthropic') {
        endpoint = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
        headers['anthropic-dangerous-direct-browser-access'] = 'true';

        const messages = history.map(h => ({ role: h.role, content: h.content }));
        messages.push({ role: 'user', content: prompt });

        body = {
            model: modelName,
            max_tokens: 4096,
            messages: messages
        };
        if (systemPrompt) body.system = systemPrompt;

    } else {
        return { success: false, error: 'Proveedor no soportado.' };
    }

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body),
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error('Error de la API de IA:', data.error || data);
            let errorMessage = '';
            if (provider === 'gemini') errorMessage = data.error?.message;
            else if (provider === 'openai') errorMessage = data.error?.message;
            else if (provider === 'anthropic') errorMessage = data.error?.message || data.message;

            errorMessage = errorMessage || `Error HTTP: ${response.status}`;
            return { success: false, error: `Error de la API: ${errorMessage}`, code: response.status };
        }

        let textResponse = '';
        if (provider === 'huggingface') {
            if (data.status === 'busy') {
                return { success: false, error: data.message, code: 'BUSY' };
            }
            textResponse = data.text;
        } else if (provider === 'gemini') {
            textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else if (provider === 'openai') {
            textResponse = data.choices?.[0]?.message?.content;
        } else if (provider === 'anthropic') {
            textResponse = data.content?.[0]?.text;
        }

        if (textResponse) {
            return { success: true, text: textResponse };
        } else {
            return { success: false, error: "No se pudo extraer una respuesta válida de la API." };
        }

    } catch (error) {
        console.error('Fallo en la llamada a la API de IA:', error);
        return { success: false, error: `No se pudo conectar con el servicio de IA. (${error.message})` };
    }
}
