// Contains all logic for the Music Player floating panel

let dom;
let playlist = [];
let currentTrackIndex = -1;
let audioElement = new Audio();

function updatePlaylistUI() {
    if (!dom.playlistContainer) return;
    dom.playlistContainer.innerHTML = '';
    playlist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        if (index === currentTrackIndex) {
            item.classList.add('playing');
        }
        item.textContent = track.name;
        item.dataset.index = index;
        item.addEventListener('click', () => playTrack(index));
        dom.playlistContainer.appendChild(item);
    });
}

function playTrack(index) {
    if (index < 0 || index >= playlist.length) {
        // Stop playback if playlist ends
        audioElement.pause();
        currentTrackIndex = -1;
        dom.nowPlayingTitle.textContent = "Nada en reproducción";
        dom.musicPlayPauseBtn.textContent = "▶️";
        updatePlaylistUI();
        return;
    }
    currentTrackIndex = index;
    const track = playlist[index];
    dom.nowPlayingTitle.textContent = track.name;

    track.handle.getFile().then(file => {
        const url = URL.createObjectURL(file);
        audioElement.src = url;
        audioElement.play();
        dom.musicPlayPauseBtn.textContent = "⏸️";
    });

    updatePlaylistUI();
}

function setupEventListeners() {
    if (dom.toolbarMusicBtn) {
        dom.toolbarMusicBtn.addEventListener('click', () => {
            dom.musicPlayerPanel.classList.toggle('hidden');
        });
    }

    if (dom.musicAddBtn) {
        dom.musicAddBtn.addEventListener('click', async () => {
            try {
                const fileHandles = await window.showOpenFilePicker({
                    types: [{ description: 'Audio', accept: { 'audio/*': ['.mp3', '.wav', '.ogg'] } }],
                    multiple: true
                });
                fileHandles.forEach(handle => {
                    playlist.push({ name: handle.name, handle: handle });
                });
                updatePlaylistUI();
                if (currentTrackIndex === -1 && playlist.length > 0) {
                    playTrack(0);
                }
            } catch (err) {
                console.log("User cancelled file picker or error occurred:", err);
            }
        });
    }

    if (dom.musicPlayPauseBtn) {
        dom.musicPlayPauseBtn.addEventListener('click', () => {
            if (audioElement.paused && currentTrackIndex !== -1) {
                audioElement.play();
                dom.musicPlayPauseBtn.textContent = "⏸️";
            } else {
                audioElement.pause();
                dom.musicPlayPauseBtn.textContent = "▶️";
            }
        });
    }

    if (dom.musicNextBtn) {
        dom.musicNextBtn.addEventListener('click', () => {
            playTrack((currentTrackIndex + 1) % playlist.length);
        });
    }

    if (dom.musicPrevBtn) {
        dom.musicPrevBtn.addEventListener('click', () => {
            const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
            playTrack(newIndex);
        });
    }

    if (dom.musicVolumeSlider) {
        dom.musicVolumeSlider.addEventListener('input', (e) => {
            audioElement.volume = e.target.value;
        });
    }

    audioElement.addEventListener('ended', () => {
        playTrack((currentTrackIndex + 1) % playlist.length); // Autoplay next
    });
}


export function initialize(domCache) {
    dom = domCache;
    setupEventListeners();
}
