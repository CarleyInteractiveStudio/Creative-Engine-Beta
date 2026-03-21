import { transpile } from './js/editor/CES_Transpiler.js';
import * as AutoReparator from './js/editor/AutoReparator.js';

// Mock Localization
window.Localization = { get: (k, d) => d };

async function test() {
    const codeWithIssues = `// Un comentario arriba
alactualizar(delta) {
    imprimir("hola");
}`;

    console.log("--- TESTING TRANSPILER WITH LOWERCASE METHOD ---");
    const result = transpile(codeWithIssues, "test.ces");
    if (result.errors) {
        console.log("Transpile errors:", result.errors);
    } else {
        console.log("Transpile SUCCESS");
        // Check if alactualizar was mapped to update
        if (result.jsCode.includes("async update")) {
             console.log("Mapping OK: alactualizar -> update");
        } else {
             console.log("Mapping FAILED");
        }
    }

    console.log("\n--- TESTING AUTO REPARATOR ---");
    const repairResult = await AutoReparator.repair(codeWithIssues, "test.ces");
    console.log("Repair Message:", repairResult.message);
    console.log("Repaired Code:\n", repairResult.code);

    if (repairResult.code.includes("ve motor;")) console.log("Import check: OK");
    if (repairResult.code.includes("alActualizar")) console.log("Keyword fix: OK");
}

test();
