/**
 * DataCollectorProvider.js
 *
 * Handles anonymous collection of CES scripts and metadata for
 * Carley IA training. Data is sent to a Hugging Face Space API.
 */

const COLLECTOR_URL = "https://carley1234-ces-collector.hf.space/collect";

/**
 * Packages all CES scripts from the project and sends them to the collector.
 * @param {FileSystemDirectoryHandle} projectHandle
 * @param {object} metadata - Engine version, project type, etc.
 */
export async function collectProjectData(projectHandle, metadata) {
    if (!projectHandle) return;

    try {
        const scripts = [];
        await scanForScripts(projectHandle, scripts);

        if (scripts.length === 0) return;

        const payload = {
            scripts: scripts,
            metadata: {
                ...metadata,
                timestamp: Date.now(),
                platform: navigator.platform,
                userAgent: navigator.userAgent
            }
        };

        const response = await fetch(COLLECTOR_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('[DataCollector] Collection result:', result);
    } catch (e) {
        console.warn('[DataCollector] Failed to send telemetry:', e);
    }
}

async function scanForScripts(dirHandle, results, currentPath = 'Assets') {
    for await (const entry of dirHandle.values()) {
        const entryPath = `${currentPath}/${entry.name}`;
        if (entry.kind === 'file' && entry.name.endsWith('.ces')) {
            const file = await entry.getFile();
            const content = await file.text();
            results.push({
                name: entry.name,
                path: entryPath,
                content: content
            });
        } else if (entry.kind === 'directory') {
            await scanForScripts(entry, results, entryPath);
        }
    }
}
