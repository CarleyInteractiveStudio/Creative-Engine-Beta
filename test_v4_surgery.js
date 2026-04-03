const examples = [
    { title: "movement", code: "posicion.x += 10;" },
    { title: "physics", code: "fisica.applyImpulse(0, -10);" }
];

const testSurgery = (badLine) => {
    let bestFix = null;
    let maxSimilarity = 0;

    examples.forEach(ex => {
        const exLines = ex.code.split('\n');
        exLines.forEach(exLine => {
            const trimmedExLine = exLine.trim();
            const words1 = badLine.toLowerCase().match(/\w+/g) || [];
            const words2 = trimmedExLine.toLowerCase().match(/\w+/g) || [];
            const set1 = new Set(words1);
            const set2 = new Set(words2);
            const intersection = new Set([...set1].filter(x => set2.has(x)));

            const similarity = (intersection.size / Math.max(set1.size, set2.size));
            if (similarity > maxSimilarity) {
                maxSimilarity = similarity;
                bestFix = trimmedExLine;
            }
        });
    });
    return { bestFix, maxSimilarity };
};

console.log("Surgery for 'posicion x mas 10':", testSurgery("posicion x mas 10"));
