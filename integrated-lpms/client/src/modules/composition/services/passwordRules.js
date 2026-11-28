export const PASSWORD_REQUIREMENTS = [
    {
        id: 'length',
        label: 'At least 8 characters long',
        test: (pw) => typeof pw === 'string' && pw.length >= 8,
    },
    {
        id: 'upper',
        label: 'At least one uppercase letter (A–Z)',
        test: (pw) => typeof pw === 'string' && /[A-Z]/.test(pw),
    },
    {
        id: 'lower',
        label: 'At least one lowercase letter (a–z)',
        test: (pw) => typeof pw === 'string' && /[a-z]/.test(pw),
    },
    {
        id: 'digit',
        label: 'At least one number (0–9)',
        test: (pw) => typeof pw === 'string' && /[0-9]/.test(pw),
    },
];

export function evaluatePasswordRequirements(password) {
    return PASSWORD_REQUIREMENTS.map((rule) => ({
        id: rule.id,
        label: rule.label,
        passed: Boolean(rule.test(password)),
    }));
}

export function validatePassword(password, confirm) {
    for (const rule of PASSWORD_REQUIREMENTS) {
        if (!rule.test(password)) {
            return `Password must contain: ${rule.label.toLowerCase()}.`;
        }
    }
    if (confirm !== undefined && password !== confirm) {
        return 'New password and confirmation do not match.';
    }
    return null;
}
