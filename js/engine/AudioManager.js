// AudioManager.js

class AudioManager {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.audioCache = new Map();
        this.playingSources = new Set();
    }

    async loadAudio(url) {
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

    playSound(audioBuffer, volume = 1.0, loop = false) {
        if (!audioBuffer) return;

        const source = this.audioContext.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        source.loop = loop;
        source.start(0);

        // Track this source
        this.playingSources.add(source);
        source.onended = () => {
            this.playingSources.delete(source);
        };

        return source;
    }

    stopAllSounds() {
        this.playingSources.forEach(source => {
            source.stop(0);
        });
        this.playingSources.clear();
        console.log("All sounds stopped.");
    }
}

export default new AudioManager();
