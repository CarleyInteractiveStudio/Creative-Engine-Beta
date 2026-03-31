import * as CES_Transpiler from './js/editor/CES_Transpiler.js';
const code = 'iniciar() { reproducir("idle"); posicion.x = 10; }';
const result = CES_Transpiler.transpile(code, 'TestAPI.ces');
console.log(result.jsCode);
