import { repair } from './js/editor/AutoReparator.js';

// Mock window and Localization
global.window = {
    Localization: { get: (k, d) => d },
    getSelectedMateria: () => ({ id: 1, getComponent: () => null })
};

async function testAutoReparator() {
    console.log("--- Test 1: Redundant Declaration ---");
    const code1 = "ve motor;\nnumero velocity = 10;";
    const result1 = await repair(code1, "test1.ces");
    console.log("Original:", code1);
    console.log("Repaired:", result1.code);
    if (result1.code.includes("publico numero numero")) {
        console.error("FAIL: Redundant 'numero' declaration found!");
    } else {
        console.log("PASS: No redundant declaration.");
    }

    console.log("\n--- Test 2: Surgical Pattern Suggestion (Movement) ---");
    const code2 = "ve motor;\npublico numero velocidad = 5;\nalActualizar(delta) {\n    si (teclaPresionada(\"w\"))\n}";
    const result2 = await repair(code2, "test2.ces");
    console.log("Repaired Code contains movement suggestion:", result2.code.includes("posicion.y -= velocidad * delta") || result2.code.includes("posicion.x += velocidad * delta"));

    console.log("\n--- Test 3: Surgical Pattern Suggestion (No Combat in Movement) ---");
    if (result2.code.includes("instanciar(proyectil")) {
        console.error("FAIL: Combat suggestion in movement script!");
    } else {
        console.log("PASS: No combat suggestion in movement script.");
    }

    console.log("\n--- Test 4: Missing Component Detection (Runtime Error) ---");
    const runtimeError = { message: "Cannot read property 'velocity' of null", scriptName: "test4.ces" };
    const result4 = await repair(code1, "test4.ces", runtimeError);
    console.log("Add Component Suggested:", result4.addComponent);
    if (result4.addComponent && result4.addComponent.componentType === "Rigidbody2D") {
        console.log("PASS: Correctly suggested Rigidbody2D.");
    } else {
        console.error("FAIL: Did not suggest Rigidbody2D for velocity error.");
    }
}

testAutoReparator();
