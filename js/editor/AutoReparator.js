
import * as SceneManager from '../engine/SceneManager.js';

export async function runMigration(projectsDirHandle, currentProjectConfig) {
    const projectName = new URLSearchParams(window.location.search).get('project');
    if (!projectName || !projectsDirHandle) return;

    try {
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const assetsHandle = await projectHandle.getDirectoryHandle('Assets');

        console.log("[AutoReparator] Iniciando migración de coordenadas a +Y UP...");

        async function processDirectory(handle, path = 'Assets') {
            for await (const entry of handle.values()) {
                if (entry.kind === 'directory') {
                    await processDirectory(entry, path + '/' + entry.name);
                } else if (entry.kind === 'file') {
                    if (entry.name.endsWith('.ceScene') || entry.name.endsWith('.ceprefab')) {
                        await migrateFile(entry, handle, path);
                    }
                }
            }
        }

        async function migrateFile(fileHandle, parentHandle, path) {
            console.log(`[AutoReparator] Migrando: ${path}/${fileHandle.name}`);
            const file = await fileHandle.getFile();
            const content = await file.text();
            let data;
            try {
                data = JSON.parse(content);
            } catch (e) {
                console.error(`[AutoReparator] Error al parsear ${fileHandle.name}:`, e);
                return;
            }

            // Crear backup
            try {
                const backupName = fileHandle.name + '.old_y_down';
                const backupHandle = await parentHandle.getFileHandle(backupName, { create: true });
                const writable = await backupHandle.createWritable();
                await writable.write(content);
                await writable.close();
            } catch (e) {
                console.warn(`[AutoReparator] No se pudo crear backup para ${fileHandle.name}`);
            }

            // Migrar contenido
            if (data.materias) {
                data.materias.forEach(m => migrateMateria(m));
            } else {
                migrateMateria(data);
            }

            // Guardar cambios
            const writable = await fileHandle.createWritable();
            await writable.write(JSON.stringify(data, null, 2));
            await writable.close();
        }

        function migrateMateria(m) {
            const isOldSystem = currentProjectConfig.coordinateSystem !== 'Y-UP';

            if (m.leyes) {
                m.leyes.forEach(ley => {
                    const props = ley.properties;
                    if (!props) return;

                    if (isOldSystem) {
                        if (ley.type === 'Transform') {
                            if (props.localPosition) props.localPosition.y *= -1;
                        } else if (ley.type === 'BoxCollider2D' || ley.type === 'CircleCollider2D' || ley.type === 'CapsuleCollider2D' || ley.type === 'PolygonCollider2D' || ley.type === 'LineCollider2D') {
                            if (props.offset) props.offset.y *= -1;
                            if (ley.type === 'PolygonCollider2D' && props.vertices) {
                                props.vertices.forEach(v => v.y *= -1);
                            }
                            if (ley.type === 'LineCollider2D' && props.points) {
                                props.points.forEach(p => p.y *= -1);
                            }
                        } else if (ley.type === 'PointLight2D' || ley.type === 'SpotLight2D') {
                            if (props.offset) props.offset.y *= -1;
                        } else if (ley.type === 'Tilemap') {
                            if (props.layers) {
                                props.layers.forEach(layer => {
                                    if (layer.position) layer.position.y *= -1;
                                });
                            }
                        }
                    }
                });
            }
            if (m.children) {
                m.children.forEach(c => migrateMateria(c));
            }
        }

        await processDirectory(assetsHandle);

        // Actualizar configuración del proyecto
        currentProjectConfig.coordinateSystem = 'Y-UP';
        currentProjectConfig.engineVersion = '2.0.6';

        // El guardado del config se hará en editor.js tras llamar a esta función

        console.log("[AutoReparator] Migración completada con éxito.");
        return true;
    } catch (error) {
        console.error("[AutoReparator] Error durante la migración:", error);
        return false;
    }
}
