
import { repair } from './js/editor/AutoReparator.js';

// Mock window and other dependencies
global.window = {
    Localization: { get: (k, d) => d },
    Dialogs: { showNotification: () => {}, showConfirmation: () => {} },
    getSelectedMateria: () => ({ id: 0, getComponent: () => null })
};

async function test() {
    console.log("Reproduction Test...");

    // Scenario 1: si + function call missing closing paren
    const code1 = `ve motor;
alActualizar(delta) {
    si teclaPresionada("w" {
        posicion.y -= 5;
    }
}`;
    const result1 = await repair(code1, "test.ces");
    console.log("\nResult 1 (si + missing inner paren):");
    console.log(result1.code);

    // Scenario 2: si + function call (already has parens but maybe something else breaks)
    const code2 = `ve motor;
alActualizar(delta) {
    si teclaPresionada("w")
    {
        posicion.y -= 5;
    }
}`;
    const result2 = await repair(code2, "test.ces");
    console.log("\nResult 2 (si on its own line):");
    console.log(result2.code);
}

test().catch(console.error);
