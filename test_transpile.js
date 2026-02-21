import * as CES_Transpiler from './js/editor/CES_Transpiler.js';
const code = 'public Sprite miIcono;';
const result = CES_Transpiler.transpile(code, 'Test.ces');
console.log(JSON.stringify(CES_Transpiler.getScriptMetadata('Test.ces'), null, 2));
