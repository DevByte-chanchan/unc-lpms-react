const fs = require('fs');
let c = fs.readFileSync('composition/client/src/components/CriteriaForGrading.jsx', 'utf8');

const targetStr = `const renderInput = (coIndex, iloIndex, field, isWeight = false) => {
        const ilo = isEditing ? editData[coIndex].ilos[iloIndex] : criteriaData.gradingSystem[coIndex].ilos[iloIndex];
        const val = isWeight ? (ilo.weight ? ilo.weight[field] : '') : ilo[field];
        const displayVal = Array.isArray(val) ? val.join(', ') : (val ?? '');

        if (isEditing) {`;
        
const replaceStr = `const renderInput = (coIndex, iloIndex, field, isWeight = false) => {
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

        if (isEditable) {`;

c = c.replace(targetStr, replaceStr);

c = c.replace(
    'onClick={handleEditToggle}',
    'onClick={handleEditToggle}\n                        disabled={isEditing && JSON.stringify(editData) === JSON.stringify(criteriaData.gradingSystem)}'
);

fs.writeFileSync('composition/client/src/components/CriteriaForGrading.jsx', c, 'utf8');
console.log('Fixed CriteriaForGrading properly');