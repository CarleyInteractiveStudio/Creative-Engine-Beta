// js/engine/MicrophoneManager.js

let stream = null;
let audioContext = null;
let analyser = null;
let dataArray = null;
let volumeCallback = null;
let isInitialized = false;
let isRecording = false;

async function initialize() {
    if (isInitialized) return true;
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        isInitialized = true;
        isRecording = true;
        update();
        return true;
    } catch (err) {
        console.error("Error accessing microphone:", err);
        return false;
    }
}

export async function startRecording(onVolumeChange) {
    if (isRecording) return;
    volumeCallback = onVolumeChange;
    const success = await initialize();
    if (!success) {
        throw new Error("Could not access microphone.");
    }
}

export function stopRecording() {
    if (!isRecording || !stream) return;
    stream.getTracks().forEach(track => track.stop());
    audioContext.close();
    stream = null;
    audioContext = null;
    analyser = null;
    dataArray = null;
    isInitialized = false;
    isRecording = false;
    if (volumeCallback) {
        volumeCallback(0);
    }
    volumeCallback = null;
}

export function getVolume() {
    if (!isRecording || !analyser) return 0;
    analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (const amplitude of dataArray) {
        sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / dataArray.length);
    return rms / 128; // Normalize to a 0-1 range
}

function update() {
    if (!isRecording) return;
    if (volumeCallback) {
        const volume = getVolume();
        volumeCallback(volume);
    }
    requestAnimationFrame(update);
}
