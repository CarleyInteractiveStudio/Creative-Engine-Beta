document.addEventListener('DOMContentLoaded', () => {
    // --- Project Name Logic ---
    const projectNameDisplay = document.getElementById('project-name-display');
    const params = new URLSearchParams(window.location.search);
    const projectName = params.get('project');

    if (projectName) {
        projectNameDisplay.textContent = projectName;
    } else {
        projectNameDisplay.textContent = "Proyecto sin nombre";
    }

    // --- Theme Switcher Logic ---
    const themeButtons = document.querySelectorAll('.theme-btn');
    const htmlElement = document.documentElement;

    themeButtons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.dataset.themeSet;
            htmlElement.setAttribute('data-theme', theme);
            themeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // --- View & Game Control Logic ---
    const sceneViewBtn = document.getElementById('btn-scene-view');
    const gameViewBtn = document.getElementById('btn-game-view');
    const gameControls = document.getElementById('game-controls');
    const sceneContent = document.getElementById('scene-content');
    const gameContent = document.getElementById('game-content');

    const playBtn = document.getElementById('btn-play');
    const pauseBtn = document.getElementById('btn-pause');
    const stopBtn = document.getElementById('btn-stop');

    sceneViewBtn.addEventListener('click', () => {
        // Switch to Scene View
        gameContent.style.display = 'none';
        sceneContent.style.display = 'block';
        gameControls.style.display = 'none';

        gameViewBtn.classList.remove('active');
        sceneViewBtn.classList.add('active');
    });

    gameViewBtn.addEventListener('click', () => {
        // Switch to Game View
        sceneContent.style.display = 'none';
        gameContent.style.display = 'block';
        gameControls.style.display = 'flex'; // Use flex to show it

        sceneViewBtn.classList.remove('active');
        gameViewBtn.classList.add('active');
    });

    playBtn.addEventListener('click', () => {
        // "Play" the game
        playBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        stopBtn.style.display = 'inline-block';
        console.log("Game playing...");
    });

    pauseBtn.addEventListener('click', () => {
        // "Pause" the game
        pauseBtn.style.display = 'none';
        playBtn.style.display = 'inline-block';
        // Stop button remains visible while paused
        console.log("Game paused.");
    });

    stopBtn.addEventListener('click', () => {
        // "Stop" the game
        stopBtn.style.display = 'none';
        pauseBtn.style.display = 'none';
        playBtn.style.display = 'inline-block';
        console.log("Game stopped.");
    });


    console.log('Creative Engine Editor Initialized with View Controls.');
});
