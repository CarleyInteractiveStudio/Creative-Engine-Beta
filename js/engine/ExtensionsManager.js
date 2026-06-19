/**
 * ExtensionsManager.js
 * Manages downloading and storing shared assets in the root /Extensions folder.
 * (c) 2024 Carley Interactive Studio
 */

import { getFileHandleForPath } from './AssetUtils.js';

export class ExtensionsManager {
    static async downloadExtension(assetPath, remoteUrl) {
        if (!window.projectsDirHandle) return false;

        try {
            console.log(`[Extensions] Downloading ${assetPath} from ${remoteUrl}...`);
            const response = await fetch(remoteUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const blob = await response.blob();

            const pathParts = assetPath.split('/');
            const fileName = pathParts.pop();
            const dirPath = pathParts.join('/');

            let currentHandle = await window.projectsDirHandle.getDirectoryHandle('Extensions', { create: true });

            // Create subdirectories if needed
            const subParts = dirPath.replace('Extensions/', '').split('/').filter(p => p);
            for (const part of subParts) {
                currentHandle = await currentHandle.getDirectoryHandle(part, { create: true });
            }

            const fileHandle = await currentHandle.getFileHandle(fileName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();

            console.log(`[Extensions] Successfully saved ${assetPath}`);
            return true;
        } catch (e) {
            console.error(`[Extensions] Failed to download extension:`, e);
            return false;
        }
    }

    static async isExtensionDownloaded(assetPath) {
        try {
            const handle = await getFileHandleForPath(assetPath, window.projectsDirHandle);
            return !!handle;
        } catch (e) {
            return false;
        }
    }

    static getAvailableExtensions() {
        // This would typically come from a server API.
        // Mocking some data for the task.
        return [
            {
                id: 'city-pack-01',
                name: 'Ciudad Industrial Pack',
                description: 'Edificios, pistas y utileria urbana.',
                type: '3D Model',
                thumbnail: 'https://images.pexels.com/photos/1034662/pexels-photo-1034662.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
                assets: [
                    { path: 'Extensions/Models/City/Building_A.glb', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb' },
                    { path: 'Extensions/Models/City/Street_Section.glb', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb' }
                ]
            },
            {
                id: 'race-track-01',
                name: 'Pista de Carreras Pro',
                description: 'Pista completa con curvas cerradas y rectas largas.',
                type: '3D Scene',
                thumbnail: 'https://images.pexels.com/photos/35967/pexels-photo-35967.jpg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
                assets: [
                    { path: 'Extensions/Models/Tracks/RaceTrack.glb', url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Box/glTF-Binary/Box.glb' }
                ]
            }
        ];
    }
}
