'use strict';

// Creates the FIRST superuser with a random password. Refuses once any superuser exists, so it
// cannot be used later to mint admins. The password is returned for the caller to print once;
// only its hash is stored. The first sign-in forces a password change (no expiry: with no other
// superuser, an expired password would lock everyone out). Further superusers are created from the admin page.

const { hashPassword } = require('./password');
const { generatePassword } = require('./generatedPassword');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const bootstrapSuperuser = async ({ User, audit, name, email }) => {
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanName || cleanName.length > 120) throw new Error('A name is required (up to 120 characters).');
    if (!EMAIL_PATTERN.test(cleanEmail)) throw new Error('A valid email is required.');
    if (await User.count({ where: { role: 'superuser' } }) > 0) throw new Error('A superuser already exists. Create more from the admin page.');
    if (await User.findOne({ where: { email: cleanEmail } })) throw new Error('An account with that email already exists.');

    const password = generatePassword();
    const user = await User.create({ name: cleanName, email: cleanEmail, role: 'superuser', password_hash: await hashPassword(password), must_change_password: true });
    await audit({ actor: null, action: 'SUPERUSER_BOOTSTRAPPED', entityType: 'users', entityId: user.user_id, details: { target_user_id: user.user_id, new_role: 'superuser' } });
    return { user, password };
};

module.exports = { bootstrapSuperuser };
