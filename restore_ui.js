const fs = require('fs');
let c = fs.readFileSync('composition/client/src/components/CriteriaForGrading.jsx', 'utf8');

c = c.replace(
    /const renderInput = \(coIndex, iloIndex, field, isWeight = false\) => \{\n\s+const ilo = isEditing \? editData\[coIndex\]\.ilos\[iloIndex\] : criteriaData\.gradingSystem\[coIndex\]\.ilos\[iloIndex\];\n\s+const val = isWeight \? \(ilo\.weight \? ilo\.weight\[field\] : ''\) : ilo\[field\];\n\s+const displayVal = Array\.isArray\(val\) \? val\.join\(', '\) : \(val \?\? ''\);\n\n\s+if \(isEditing\) \{/g,
    `const renderInput = (coIndex, iloIndex, field, isWeight = false) => {
        const originalIlo = criteriaData.gradingSystem[coIndex].ilos[iloIndex];
        const originalVal = isWeight ? (originalIlo.weight ? originalIlo.weight[field] : '') : originalIlo[field];
        
        const ilo = isEditing ? editData[coIndex].ilos[iloIndex] : originalIlo;
        const val = isWeight ? (ilo.weight ? ilo.weight[field] : '') : ilo[field];
        const displayVal = Array.isArray(val) ? val.join(', ') : (val ?? '');

        let isEditable = isEditing;
        if (isEditing && isWeight) {
            if (!originalVal || String(originalVal).trim() === '') {
                isEditable = false;
            }
        }

        if (isEditable) {`
);

c = c.replace(
    /<button \n\s+className=\{'matrix-edit-btn ' \+ \(isEditing \? 'save-mode' : ''\)\} \n\s+onClick=\{handleEditToggle\}\n\s+>/g,
    `<button 
                        className={'matrix-edit-btn ' + (isEditing ? 'save-mode' : '')} 
                        onClick={handleEditToggle}
                        disabled={isEditing && JSON.stringify(editData) === JSON.stringify(criteriaData.gradingSystem)}
                    >`
);

fs.writeFileSync('composition/client/src/components/CriteriaForGrading.jsx', c, 'utf8');
console.log('Restored frontend CriteriaForGrading fixes');
