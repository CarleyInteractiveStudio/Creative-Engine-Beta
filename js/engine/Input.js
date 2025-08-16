const InputManager = (() => {
    const state = {
        keys: {},
        mouse: {
            x: 0,
            y: 0,
            canvasX: 0,
            canvasY: 0,
            buttons: {},
        },
        canvas: null,
    };

    const initialize = (canvas) => {
        state.canvas = canvas;
        window.addEventListener('keydown', (e) => state.keys[e.code] = true);
        window.addEventListener('keyup', (e) => state.keys[e.code] = false);

        window.addEventListener('mousemove', (e) => {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;

            if (state.canvas) {
                const rect = state.canvas.getBoundingClientRect();
                state.mouse.canvasX = e.clientX - rect.left;
                state.mouse.canvasY = e.clientY - rect.top;
            }
        });

        window.addEventListener('mousedown', (e) => state.mouse.buttons[e.button] = true);
        window.addEventListener('mouseup', (e) => state.mouse.buttons[e.button] = false);
    };

    const isKeyDown = (keyCode) => !!state.keys[keyCode];
    const isMouseButtonDown = (button) => !!state.mouse.buttons[button];

    const getMousePosition = () => ({ x: state.mouse.x, y: state.mouse.y });
    const getMousePositionInCanvas = () => ({ x: state.mouse.canvasX, y: state.mouse.canvasY });

    const getMouseWorldPosition = (camera, canvas) => {
        if (!camera) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        // 1. Mouse position in canvas pixels
        const mouseX = state.mouse.x - rect.left;
        const mouseY = state.mouse.y - rect.top;

        // 2. Convert to normalized device coordinates (NDC) [-1, 1]
        const ndcX = (mouseX / canvas.width) * 2 - 1;
        const ndcY = 1 - (mouseY / canvas.height) * 2;

        // 3. Un-project from camera space
        const worldX = (ndcX * (camera.orthographicSize * (canvas.width / canvas.height))) / camera.zoom + camera.x;
        const worldY = (ndcY * camera.orthographicSize) / camera.zoom + camera.y;

        return { x: worldX, y: worldY };
    };

    return {
        initialize,
        isKeyDown,
        isMouseButtonDown,
        getMousePosition,
        getMousePositionInCanvas,
        getMouseWorldPosition,
        update: () => {}, // Placeholder for future state updates if needed
        getPressedKeys: () => Object.keys(state.keys).filter(k => state.keys[k]),
        getMouseButton: (btn) => !!state.mouse.buttons[btn],
    };
})();

export { InputManager };
