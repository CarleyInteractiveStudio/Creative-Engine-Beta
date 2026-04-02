import { transpile } from '../js/editor/CES_Transpiler.js';

console.log("Starting Transpilation Test (Infinite Loop Check)...");

const codeWithLoop = `
// cada(1) {  }
cada(2) {
    imprimir("Hola");
}
`;

console.log("Input Code:", codeWithLoop);

try {
    const result = transpile(codeWithLoop, "TestScript.ces");
    console.log("Transpilation Finished Successfully!");
    if (result.errors) {
        console.log("Errors found:", result.errors);
    } else {
        console.log("JS Code Generated:", result.jsCode.substring(0, 200) + "...");
    }
} catch (e) {
    console.error("Transpilation Failed with Exception:", e);
}
