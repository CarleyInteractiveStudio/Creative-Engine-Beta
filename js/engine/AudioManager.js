// js/engine/AudioManager.js

import { Transform } from './Components.js';

let audioSources = [];
let audioListener = null;
let scene = null;

function getDistance(transform1, transform2) {
    const dx = transform1.x - transform2.x;
    const dy = transform1.y - transform2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

export function initialize(currentScene) {
    scene = currentScene;
    refreshAudioComponents();
}

export function refreshAudioComponents() {
    if (!scene) return;
    audioSources = [];
    audioListener = null;
    const allMaterias = scene.getAllMaterias();
    for (const materia of allMaterias) {
        const audioComponent = materia.getComponent('Audio');
        if (audioComponent) {
            audioSources.push(audioComponent);
        }
        if (!audioListener) {
            const listenerComponent = materia.getComponent('AudioListener');
            if (listenerComponent) {
                audioListener = listenerComponent;
            }
        }
    }
}


export function update(deltaTime) {
    if (!audioListener) {
        return;
    }

    const listenerTransform = audioListener.materia.getComponent(Transform);
    if (!listenerTransform) return;

    for (const source of audioSources) {
        if (!source.audio || !source.isLoaded) continue;

        const sourceTransform = source.materia.getComponent(Transform);
        if (!sourceTransform) continue;

        const distance = getDistance(listenerTransform, sourceTransform);
        const maxDistance = 500;
        let volume = 1.0;

        if (distance > maxDistance) {
            volume = 0;
        } else {
            volume = (1 - (distance / maxDistance)) * source.volume;
        }

        source.audio.volume = Math.max(0, Math.min(1, volume));
    }
}
