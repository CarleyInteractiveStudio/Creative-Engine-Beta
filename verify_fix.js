import * as CES_Transpiler from './js/editor/CES_Transpiler.js';

const code = `
public Sprite miIcono;

saludar() {
    imprimir("hola");
}

publico funcion saltar() {
    fisica.addForce(0, 10);
}

alEmpezar() {
    imprimir("iniciado");
}
`;

const result = CES_Transpiler.transpile(code, 'Test.ces');
console.log("Metadata:");
console.log(JSON.stringify(CES_Transpiler.getScriptMetadata('Test.ces'), null, 2));

if (result.errors) {
    console.error("Transpilation Errors:", result.errors);
} else {
    console.log("\nJS Code:");
    console.log(result.jsCode);
}
