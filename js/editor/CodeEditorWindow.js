// --- Module for the Code Editor Window (CodeMirror) ---

import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6.2.2";
import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6.1.2";
import { undo, redo } from "https://esm.sh/@codemirror/commands@6.3.3";
import { autocompletion } from "https://esm.sh/@codemirror/autocomplete@6.16.0";
import { transpile } from './CES_Transpiler.js';
import * as AIHandler from './AIHandler.js';
import { getPreferences } from './ui/PreferencesWindow.js';

// --- Module State ---
let dom;
let codeEditor = null;
let currentlyOpenFileHandle = null;
let currentlyOpenDirHandle = null;
let showConsoleCallback = () => {}; // Placeholder for the callback
let hotReloadCallback = () => {}; // Placeholder for hot reload
const cesKeywords = [
    { label: "public", type: "keyword" },
    { label: "private", type: "keyword" },
    { label: "sprite", type: "type" },
    { label: "SpriteAnimacion", type: "type" },
    { label: "crear", type: "function" },
    { label: "destruir", type: "function" },
    { label: "reproducir", type: "function" },
    { label: "obtener", type: "function" },
    { label: "si", type: "keyword" },
    { label: "sino", type: "keyword" },
    { label: "para", type: "keyword" },
    { label: "mientras", type: "keyword" },
    { label: "start", type: "function" },
    { label: "update", type: "function" }
];

function cesCompletions(context) {
    let word = context.matchBefore(/\w*/);
    if (word.from == word.to && !context.explicit) {
        return null;
    }
    return {
        from: word.from,
        options: cesKeywords
    };
}


// --- Public API ---

export async function openScriptInEditor(fileName, dirHandle, scenePanel) {
    try {
        currentlyOpenFileHandle = await dirHandle.getFileHandle(fileName);
        currentlyOpenDirHandle = dirHandle;
        const file = await currentlyOpenFileHandle.getFile();
        const content = await file.text();

        if (fileName.endsWith('.chc')) {
            console.log(`[CHC] Abriendo editor integrado para ${fileName}`);
            openChcEditor(content);
            const toggleBtn = scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]');
            if (toggleBtn) toggleBtn.click();
            return;
        }

        // Switch to Code Editor View
        if (dom.chcIntegratedEditor) dom.chcIntegratedEditor.classList.add('hidden');
        dom.codeEditorToolbar.classList.remove('hidden');
        dom.codemirrorContainer.style.display = 'block';

        if (!codeEditor) {
            codeEditor = new EditorView({
                doc: content,
                extensions: [
                    basicSetup,
                    javascript(),
                    oneDark,
                    autocompletion({ override: [cesCompletions] })
                ],
                parent: dom.codemirrorContainer
            });
        } else {
            codeEditor.dispatch({
                changes: { from: 0, to: codeEditor.state.doc.length, insert: content }
            });
        }

        scenePanel.querySelector('.view-toggle-btn[data-view="code-editor-content"]').click();
        console.log(`Abierto ${fileName} en el editor.`);
    } catch (error) {
        console.error(`Error al abrir el script '${fileName}':`, error);
        window.Dialogs.showNotification('Error', `No se pudo abrir el script '${fileName}'. Revisa la consola.`);
    }
}

export async function saveCurrentScript() {
    if (!currentlyOpenFileHandle) {
        window.Dialogs.showNotification('Aviso', 'No hay ningún script abierto para guardar.');
        return;
    }

    const isChc = currentlyOpenFileHandle.name.endsWith('.chc');
    if (!isChc && !codeEditor) {
        window.Dialogs.showNotification('Aviso', 'No hay ningún script abierto para guardar.');
        return;
    }

    try {
        const scriptContent = isChc ? dom.chcHumanText.value : codeEditor.state.doc.toString();
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(scriptContent);
        await writable.close();
        window.Dialogs.showNotification('Éxito', `Script '${currentlyOpenFileHandle.name}' guardado.`);

        // Ahora, transpila y comprueba si hay errores
        console.clear(); // Limpia la consola antes de mostrar nuevos errores
        const result = transpile(scriptContent, currentlyOpenFileHandle.name);
        if (result.errors && result.errors.length > 0) {
            console.error(`Errores de compilación en ${currentlyOpenFileHandle.name}:`);
            result.errors.forEach(error => console.error(`- ${error}`));
            showConsoleCallback(); // Muestra la consola al usuario
        } else {
            console.log(`Script ${currentlyOpenFileHandle.name} compilado exitosamente.`);
        }

    } catch (error) {
        console.error("Error al guardar el script:", error);
        window.Dialogs.showNotification('Error', 'No se pudo guardar el script.');
    }
}

export function undoLastChange() {
    if (codeEditor) undo(codeEditor);
}

export function redoLastChange() {
    if (codeEditor) redo(codeEditor);
}

export function openChcEditor(content) {
    if (!dom.chcIntegratedEditor) return;

    dom.codemirrorContainer.style.display = 'none';
    dom.codeEditorToolbar.classList.add('hidden');
    dom.chcIntegratedEditor.classList.remove('hidden');
    dom.chcHumanText.value = content;
}

async function runChc() {
    if (!currentlyOpenFileHandle || !currentlyOpenFileHandle.name.endsWith('.chc')) return;

    const humanText = dom.chcHumanText.value.trim();
    if (!humanText) {
        window.Dialogs.showNotification('Aviso', 'Por favor, escribe algo antes de correr el script.');
        return;
    }

    const prefs = getPreferences();
    const provider = prefs.ai?.provider;
    const apiKey = localStorage.getItem(`creativeEngine_${provider}_apiKey`);

    if (!provider || provider === 'none' || !apiKey) {
        window.Dialogs.showNotification('Configuración Requerida', 'Para usar CHC, debes configurar Carl IA en las Preferencias del motor.');
        return;
    }

    dom.chcLoadingOverlay.classList.remove('hidden');
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Llamando a Carl IA...';
    dom.chcRunBtn.classList.add('compiling');
    dom.chcRunBtn.textContent = '🤖 Carl está pensando...';

    // Simulate analysis phase for better UX
    await new Promise(r => setTimeout(r, 800));
    if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Carl está analizando tu lógica creativa...';

    const prompt = `Actúa como el traductor de Creative H-Code (CHC) para Creative Engine.
Tu tarea es traducir la descripción humana del comportamiento de un objeto en un script válido de Creative Engine (.ces).

REGLAS TÉCNICAS (Sintaxis CES):
0. IMPORTACIONES: Pon 've motor;' al inicio para habilitar atajos. Usa 've motor.ui;' para UI.
1. ESTRUCTURA: Usa 'publico numero velocidad = 5;' o 'publico mtr jugador;'.
2. IDIOMA: ¡Usa SIEMPRE el español! (si, sino, mientras, para, retornar, verdadero, falso, variable, constante, materia, mtr).
3. ACCESO (Sin 'this.'): nombre, tag, posicion, fisica, animador, camara, colisionador2d (genérico), particulas, ui.texto, ui.boton.
4. EVENTOS: 'alEmpezar()', 'alActualizar(delta)', 'alEntrarEnColision(otro)', 'alRecibir(mensaje, datos)'.
5. TIEMPO: 'esperar(segundos)', 'cada(segundos) { ... }'.
6. APIs:
   - lanzarRayo(origen, direccion, dist, tag), buscar(nombre).
   - crear miPrefab; (instanciar prefab).
   - destruir(materia), difundir(msg, datos).
   - entrada.tecla("nombre").
7. REGLA DE ORO: Devuelve ÚNICAMENTE el código .ces. Sin explicaciones ni markdown.

EJEMPLOS DE TRADUCCIÓN:

ENTRADA: "Si presiono W sube. Si presiono D a la derecha."
SALIDA:
ve motor;
publico numero velocidad = 5;
alActualizar(delta) {
    si (entrada.tecla("w")) {
        posicion.y -= velocidad;
    }
    si (entrada.tecla("d")) {
        posicion.x += velocidad;
    }
}

ENTRADA: "Cada 2 segundos lanza un rayo hacia abajo. Si golpea algo con tag 'suelo', imprime 'suelo'."
SALIDA:
ve motor;
alEmpezar() {
    cada(2) {
        variable hit = lanzarRayo(posicion, {x: 0, y: 1}, 100);
        si (hit && hit.mtr.tieneTag("suelo")) {
            imprimir("suelo");
        }
    }
}

ENTRADA: "Al chocar con el enemigo, espera 1 segundo y destruye este objeto."
SALIDA:
alEntrarEnColision(otro) {
    si (otro.tieneTag("enemigo")) {
        esperar(1);
        destruir(materia);
    }
}

ENTRADA DEL USUARIO:
"${humanText}"`;

    try {
        // Find a working model
        let modelToUse = prefs.ai?.model;
        if (!modelToUse) {
            // Fallback defaults if no model selected
            if (provider === 'gemini') modelToUse = 'models/gemini-1.5-flash';
            else if (provider === 'openai') modelToUse = 'gpt-3.5-turbo';
            else if (provider === 'anthropic') modelToUse = 'claude-3-haiku-20240307';
        }

        let currentPrompt = prompt;
        let attempts = 0;
        const maxAttempts = 3;
        let finalGeneratedCode = null;

        while (attempts < maxAttempts) {
            attempts++;
            const result = await AIHandler.callGenerativeAI(provider, modelToUse, apiKey, currentPrompt);

            if (!result.success) throw new Error(result.error);

            let generatedCode = result.text.trim();

            // Clean markdown blocks and conversational filler
            const codeBlockRegex = /```(?:[a-z]*\n)?([\s\S]*?)```/gi;
            const matches = [...generatedCode.matchAll(codeBlockRegex)];
            if (matches.length > 0) {
                generatedCode = matches.map(m => m[1]).join('\n');
            } else {
                // If no code blocks, try to strip leading text before the first known keyword
                const firstKeyword = generatedCode.search(/\b(public|publico|private|privado|variable|constante|numero|texto|booleano|go|alEmpezar|alActualizar)\b/i);
                if (firstKeyword !== -1) {
                    generatedCode = generatedCode.substring(firstKeyword);
                }
                // Also remove trailing conversational filler if it seems to follow the last semicolon or brace
                const lastStructuralChar = Math.max(generatedCode.lastIndexOf(';'), generatedCode.lastIndexOf('}'));
                if (lastStructuralChar !== -1) {
                    generatedCode = generatedCode.substring(0, lastStructuralChar + 1);
                }
            }

            // Validar código generado
            const validation = transpile(generatedCode, currentlyOpenFileHandle.name);
            if (!validation.errors || validation.errors.length === 0) {
                finalGeneratedCode = generatedCode;
                console.log(`CHC Traducido con éxito para ${currentlyOpenFileHandle.name} (Intento ${attempts})`);
                break;
            }

            console.warn(`[CHC] Intento ${attempts} fallido con errores de sintaxis:`, validation.errors);
            if (dom.chcLoadingText) dom.chcLoadingText.textContent = `Carl está corrigiendo errores (${attempts})...`;

            currentPrompt = `El código que generaste tiene ERRORES DE SINTAXIS. Por favor, corrígelo.
Asegúrate de:
- Definir las variables correctamente (ej: variable x = 1;)
- Definir los métodos correctamente (ej: alActualizar() { ... })
- NO incluir NINGUNA explicación ni texto fuera del código.

CÓDIGO CON ERRORES:
${generatedCode}

ERRORES ENCONTRADOS:
${validation.errors.join('\n')}

Por favor, devuelve solo el código corregido y funcional.`;
        }

        if (!finalGeneratedCode) {
            throw new Error("Carl IA no pudo generar un código libre de errores tras varios intentos.");
        }

        if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Guardando lógica traducida...';

        // Save Human text to .chc
        const writable = await currentlyOpenFileHandle.createWritable();
        await writable.write(humanText);
        await writable.close();

        // Save Generated code to .chc.meta (used by the engine at runtime)
        const metaFileName = `${currentlyOpenFileHandle.name}.meta`;
        const metaHandle = await currentlyOpenDirHandle.getFileHandle(metaFileName, { create: true });
        const metaWritable = await metaHandle.createWritable();

        const metaData = {
            generatedCode: finalGeneratedCode,
            lastGenerated: Date.now()
        };

        await metaWritable.write(JSON.stringify(metaData, null, 2));
        await metaWritable.close();

        // Notify engine to reload transpilation maps
        transpile(finalGeneratedCode, currentlyOpenFileHandle.name);

        if (dom.chcLoadingText) dom.chcLoadingText.textContent = 'Sincronizando con el motor...';
        // Hot reload in engine
        await hotReloadCallback(currentlyOpenFileHandle.name);
        await new Promise(r => setTimeout(r, 500));

        window.Dialogs.showNotification('Carl IA', '¡Listo! He traducido tu idea. ¡Mira cómo cobra vida!');

    } catch (error) {
        console.error("CHC Error:", error);
        window.Dialogs.showNotification('Error de Carl IA', `Vaya, algo salió mal al procesar tu lógica: ${error.message}`);
    } finally {
        dom.chcLoadingOverlay.classList.add('hidden');
        dom.chcRunBtn.classList.remove('compiling');
        dom.chcRunBtn.textContent = '🚀 Correr';
    }
}

export function initialize(domCache, showConsole, hotReload) {
    dom = domCache;
    showConsoleCallback = showConsole; // Almacena el callback
    hotReloadCallback = hotReload;

    // Configura los event listeners para los botones de la barra de herramientas
    dom.codeSaveBtn.addEventListener('click', () => saveCurrentScript());
    dom.codeUndoBtn.addEventListener('click', () => undoLastChange());
    dom.codeRedoBtn.addEventListener('click', () => redoLastChange());

    // CHC specific
    if (dom.chcRunBtn) {
        dom.chcRunBtn.addEventListener('click', () => runChc());
    }
}
