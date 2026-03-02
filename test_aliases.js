import * as CES_Transpiler from './js/editor/CES_Transpiler.js';
const code = `
public number potencia;
public booleano usarTodasLasCapas;

iniciar() {
    this.potencia = 100;
    this.usarTodasLasCapas = verdadero;
    imprimir(this.potencia);
}

actualizar(dt) {
    si (this.usarTodasLasCapas) {
        log("Todas activas");
    }
}
`;
const result = CES_Transpiler.transpile(code, 'TestAlias.ces');
if (result.errors) {
    console.error('Transpilation Errors:', result.errors);
} else {
    console.log('Transpiled JS Code:');
    console.log(result.jsCode);
    console.log('\nMetadata:');
    console.log(JSON.stringify(CES_Transpiler.getScriptMetadata('TestAlias.ces'), null, 2));
}
