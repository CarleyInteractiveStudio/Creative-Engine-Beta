// AudioManager.js
import { Transform } from './Components.js';

class AudioManager {
    constructor() {
        // Resume AudioContext on the first user interaction
        this.audioContext = null;
        this.audioCache = new Map();
        // Store playing sources with their spatial nodes and transforms
        this.playingSources = new Map();
        this.isInitialized = false;

        // Bind the initialization function to be called on first interaction
        this._initialize = this._initialize.bind(this);
        document.addEventListener('click', this._initialize, { once: true });
        document.addEventListener('keydown', this._initialize, { once: true });
    }

    // Initialize the AudioContext. This must be done after a user interaction.
    _initialize() {
        if (this.isInitialized) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.isInitialized = true;
        console.log("AudioContext initialized successfully.");
    }


    async loadAudio(url) {
        if (!this.isInitialized) {
            console.warn("AudioManager not initialized. Audio will not load yet.");
            return null;
        }
        if (this.audioCache.has(url)) {
            return this.audioCache.get(url);
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
            this.audioCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading audio from ${url}:`, error);
            return null;
        }
    }

    playSound(audioSource) {
        if (!this.isInitialized || !audioSource || !audioSource.audioBuffer) return null;

        const bufferSource = this.audioContext.createBufferSource();
        bufferSource.buffer = audioSource.audioBuffer;
        bufferSource.loop = audioSource.loop;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = audioSource.volume;

        let finalNode = gainNode;
        let pannerNode = null;

        const transform = audioSource.materia.getComponent(Transform);

        if (audioSource.isSpatial && transform) {
            pannerNode = this.audioContext.createPanner();

            // Configure for 2D linear audio falloff
            pannerNode.panningModel = 'HRTF';
            pannerNode.distanceModel = 'linear';
            pannerNode.refDistance = audioSource.minDistance;
            pannerNode.maxDistance = audioSource.maxDistance;
            pannerNode.rolloffFactor = 1;
            pannerNode.coneInnerAngle = 360; // Omni-directional
            pannerNode.coneOuterAngle = 360;
            pannerNode.coneOuterGain = 0;

            // Set initial position (Z is 0 for 2D)
            pannerNode.positionX.setValueAtTime(transform.x, this.audioContext.currentTime);
            pannerNode.positionY.setValueAtTime(transform.y, this.audioContext.currentTime);
            pannerNode.positionZ.setValueAtTime(0, this.audioContext.currentTime);

            bufferSource.connect(pannerNode);
            pannerNode.connect(gainNode);
            finalNode = pannerNode; // The node to connect to gain
        } else {
            bufferSource.connect(gainNode);
        }

        gainNode.connect(this.audioContext.destination);
        bufferSource.start(0);

        const playingSourceInfo = {
            bufferSource,
            pannerNode,
            gainNode,
            transform // Keep a reference to the transform for position updates
        };

        // Track this source
        this.playingSources.set(audioSource, playingSourceInfo);
        audioSource.isPlaying = true;

        bufferSource.onended = () => {
            this.playingSources.delete(audioSource);
            audioSource.isPlaying = false;
        };

        return playingSourceInfo;
    }

    stopSound(audioSource) {
        if (this.playingSources.has(audioSource)) {
            const { bufferSource } = this.playingSources.get(audioSource);
            bufferSource.stop(0);
            this.playingSources.delete(audioSource);
            audioSource.isPlaying = false;
        }
    }

    update(listenerTransform) {
        if (!this.isInitialized) return;

        // Update listener position based on the camera's transform
        if (listenerTransform) {
            const listener = this.audioContext.listener;
            // Set listener position
            listener.positionX.setValueAtTime(listenerTransform.x, this.audioContext.currentTime);
            listener.positionY.setValueAtTime(listenerTransform.y, this.audioContext.currentTime);
            listener.positionZ.setValueAtTime(0, this.audioContext.currentTime); // Assuming 2D

            // Set listener orientation (facing forward in the XY plane)
            listener.forwardX.setValueAtTime(0, this.audioContext.currentTime);
            listener.forwardY.setValueAtTime(0, this.audioContext.currentTime);
            listener.forwardZ.setValueAtTime(-1, this.audioContext.currentTime);
            listener.upX.setValueAtTime(0, this.audioContext.currentTime);
            listener.upY.setValueAtTime(1, this.audioContext.currentTime);
            listener.upZ.setValueAtTime(0, this.audioContext.currentTime);
        }

        // Update positions of all playing spatial sounds
        for (const [audioSource, sourceInfo] of this.playingSources.entries()) {
            if (sourceInfo.pannerNode && sourceInfo.transform) {
                const panner = sourceInfo.pannerNode;
                const transform = sourceInfo.transform;
                panner.positionX.setValueAtTime(transform.x, this.audioContext.currentTime);
                panner.positionY.setValueAtTime(transform.y, this.audioContext.currentTime);
            }
            // Update volume if it has changed in the component
            if (sourceInfo.gainNode.gain.value !== audioSource.volume) {
                 sourceInfo.gainNode.gain.setValueAtTime(audioSource.volume, this.audioContext.currentTime);
            }
        }
    }


    stopAllSounds() {
        if (!this.isInitialized) return;
        this.playingSources.forEach((sourceInfo, audioSource) => {
            sourceInfo.bufferSource.stop(0);
            audioSource.isPlaying = false;
        });
        this.playingSources.clear();
        console.log("All sounds stopped.");
    }
}

export default new AudioManager();
