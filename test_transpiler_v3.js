const blankOut = (code, start, end) => {
    const part = code.substring(start, end);
    const blanked = part.replace(/[^\n\r]/g, ' ');
    return code.substring(0, start) + blanked + code.substring(end);
};

const test = (code) => {
    let unprocessedCode = code;
    const rootCadaRegex = /\bcada\s*\(([^)]+)\)\s*{/g;
    let rootCadaMatch;
    let iterations = 0;
    while ((rootCadaMatch = rootCadaRegex.exec(unprocessedCode)) !== null) {
        iterations++;
        if (iterations > 10) {
            console.log("LOOP DETECTED!");
            return;
        }
        const startIdx = rootCadaMatch.index;
        const contentStartIdx = rootCadaMatch.index + rootCadaMatch[0].length;
        let braceCount = 1;
        let endIdx = -1;

        for (let i = contentStartIdx; i < unprocessedCode.length; i++) {
            const char = unprocessedCode[i];
            if (char === '{') braceCount++;
            else if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx !== -1) {
            unprocessedCode = blankOut(unprocessedCode, startIdx, endIdx + 1);
            rootCadaRegex.lastIndex = endIdx + 1;
        } else {
            rootCadaRegex.lastIndex = contentStartIdx;
        }
    }
    console.log("Success, iterations:", iterations);
};

console.log("Test 1: balanced");
test("cada(1) { } cada(2) { }");
console.log("Test 2: unbalanced");
test("cada(1) { ");
