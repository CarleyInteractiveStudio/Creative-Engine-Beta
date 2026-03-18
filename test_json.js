function extractJsonPlan(text) {
    const planMarkerRegex = /"\s*plan\s*"\s*:/;
    let searchIndex = 0;

    while (true) {
        const match = text.substring(searchIndex).match(planMarkerRegex);
        if (!match) break;

        const markerIndex = searchIndex + match.index;
        const startIndex = text.lastIndexOf('{', markerIndex);

        if (startIndex !== -1) {
            let braceCount = 0;
            let foundStart = false;
            let inString = false;
            let escape = false;
            let jsonString = '';

            for (let i = startIndex; i < text.length; i++) {
                const char = text[i];
                jsonString += char;

                if (!inString) {
                    if (char === '{') {
                        braceCount++;
                        foundStart = true;
                    } else if (char === '}') {
                        braceCount--;
                    } else if (char === '"') {
                        inString = true;
                    }
                } else {
                    if (escape) {
                        escape = false;
                    } else if (char === '\\') {
                        escape = true;
                    } else if (char === '"') {
                        inString = false;
                    }
                }

                if (foundStart && braceCount === 0) {
                    try {
                        const parsed = JSON.parse(jsonString);
                        if (parsed && parsed.plan) {
                            return {
                                json: jsonString,
                                start: startIndex,
                                end: i + 1
                            };
                        }
                    } catch (e) {}
                    break;
                }
            }
        }
        searchIndex = markerIndex + 1;
    }
    return null;
}

const test1 = 'Hola! Mira este plan: { "plan": [ { "title": "test", "commands": [] } ] }';
const test2 = 'Plan con braces en strings: { "plan": [ { "msg": "brace { inside" } ] }';
const test3 = 'Multiple JSONs: { "other": 1 } y luego { "plan": [] }';

console.log("Test 1:", extractJsonPlan(test1) ? "Pass" : "Fail");
console.log("Test 2:", extractJsonPlan(test2) ? "Pass" : "Fail");
console.log("Test 3:", extractJsonPlan(test3) ? "Pass" : "Fail");
