/**
 * @fileoverview Manages all audio playback and microphone input.
 * Provides a simple static API for controlling audio assets.
 */

class AudioManager {
    static _audioContext = null;
    static _masterVolumeNode = null;
    static _sounds = new Map(); // Caches loaded AudioBuffers
    static _activeSources = new Map(); // Tracks currently playing sounds

    /**
     * Initializes the AudioManager. Must be called by user interaction (e.g., a click).
     * @returns {boolean} True if initialization was successful, false otherwise.
     */
    static initialize() {
        if (this.initialized) {
            return true;
        }
        try {
            this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this._masterVolumeNode = this._audioContext.createGain();
            this._masterVolumeNode.connect(this._audioContext.destination);
            this.initialized = true;
            console.log("AudioManager Initialized.");
            return true;
        } catch (e) {
            console.error("Web Audio API is not supported in this browser.", e);
            this.initialized = false;
            return false;
        }
    }

    /**
     * Resumes the AudioContext. Should be called after a user interaction
     * if the context was suspended.
     */
    static resumeContext() {
        if (this._audioContext && this._audioContext.state === 'suspended') {
            this._audioContext.resume();
        }
    }

    /**
     * Loads a sound from a URL and caches it.
     * @param {string} name - The name to assign to the sound.
     * @param {string} url - The URL of the audio file.
     * @returns {Promise<AudioBuffer>}
     */
    static async loadSound(name, url) {
        if (!this.initialized) {
            console.error("AudioManager not initialized. Cannot load sound.");
            return;
        }
        if (this._sounds.has(name)) {
            return this._sounds.get(name);
        }

        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await this._audioContext.decodeAudioData(arrayBuffer);
            this._sounds.set(name, audioBuffer);
            console.log(`Sound "${name}" loaded successfully.`);
            return audioBuffer;
        } catch (error) {
            console.error(`Error loading sound "${name}" from ${url}:`, error);
        }
    }

    /**
     * Plays a cached sound.
     * @param {string} name - The name of the sound to play.
     * @param {object} [options] - Playback options.
     * @param {boolean} [options.loop=false] - Whether to loop the sound.
     * @param {number} [options.volume=1.0] - The volume for this sound (0.0 to 1.0).
     */
    static playSound(name, { loop = false, volume = 1.0 } = {}) {
        if (!this.initialized || !this._sounds.has(name)) {
            console.error(`Sound "${name}" not loaded or AudioManager not initialized.`);
            return;
        }

        this.resumeContext(); // Ensure context is active

        const audioBuffer = this._sounds.get(name);

        const source = this._audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = loop;

        const gainNode = this._audioContext.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(this._masterVolumeNode);

        source.start(0);

        this._activeSources.set(name, { source, gainNode });
    }

    /**
     * Stops a currently playing sound.
     * @param {string} name - The name of the sound to stop.
     */
    static stopSound(name) {
        if (this._activeSources.has(name)) {
            const { source } = this._activeSources.get(name);
            source.stop();
            this._activeSources.delete(name);
        }
    }

    /**
     * Sets the master volume for all sounds.
     * @param {number} volume - The volume level (0.0 to 1.0).
     */
    static setMasterVolume(volume) {
        if (this.initialized) {
            this._masterVolumeNode.gain.setValueAtTime(volume, this._audioContext.currentTime);
        }
    }

    /**
     * Requests access to the user's microphone.
     * @returns {Promise<MediaStream>} The microphone audio stream.
     */
    static async requestMicrophoneAccess() {
        if (!this.initialized) {
            console.error("AudioManager not initialized. Cannot request microphone.");
            return null;
        }
        if (this._microphoneStream) {
            return this._microphoneStream;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            this._microphoneStream = stream;
            console.log("Microphone access granted.");
            return stream;
        } catch (error) {
            console.error("Microphone access denied or not available:", error);
            return null;
        }
    }
}

// Ensure it's a singleton-like static class
AudioManager.initialized = false;

// Make it available as a global for scripts, and export for modules
window.Audio = AudioManager;
export { AudioManager };
