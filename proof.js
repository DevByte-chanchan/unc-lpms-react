const redistIloItems = (ilos, total) => {
    const newIlos = ilos.map(ilo => ({ ...ilo }));
    if (total > 0) {
        const weights = newIlos.map(ilo => (ilo.hours || 0) * (ilo.percentage || 0));
        const weightSum = weights.reduce((s, w) => s + w, 0);
        if (weightSum > 0) {
            let runningSum = 0;
            newIlos.forEach((ilo, idx) => {
                if (idx < newIlos.length - 1) {
                    const allocated = Math.round((weights[idx] / weightSum) * total);
                    ilo.items = allocated;
                    runningSum += allocated;
                } else {
                    ilo.items = total - runningSum;
                }
            });
        } else {
            const even = Math.floor(total / newIlos.length);
            let runningSum = 0;
            newIlos.forEach((ilo, idx) => {
                if (idx < newIlos.length - 1) {
                    ilo.items = even;
                    runningSum += even;
                } else {
                    ilo.items = total - runningSum;
                }
            });
        }
    } else {
        newIlos.forEach(ilo => { ilo.items = 0; });
    }
    return newIlos;
};

console.log("TEST 1: 30 points across 3 ILOs");
console.log(redistIloItems([
    { hours: 1.5, percentage: 20 },
    { hours: 3, percentage: 30 },
    { hours: 6, percentage: 50 }
], 30));

console.log("\nTEST 2: 26 points across 3 ILOs");
console.log(redistIloItems([
    { hours: 1.5, percentage: 20 },
    { hours: 3, percentage: 30 },
    { hours: 6, percentage: 50 }
], 26));

console.log("\nTEST 3: 50 points, 0 weights");
console.log(redistIloItems([
    { hours: 0, percentage: 0 },
    { hours: 0, percentage: 0 },
    { hours: 0, percentage: 0 }
], 50));
