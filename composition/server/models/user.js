'use strict';

// LPMS accounts.
//
// ROLE VOCABULARY — this is the whole reason the model exists in this shape.
// my.unc.edu.ph's login has roles like Parent, Student and Teacher because it
// is the university-wide portal. LPMS has none of those: every screen and
// every route guard in this app keys on the roles below, which are the
// same strings as `client/src/utils/session.js ROLES` and
// `client/src/utils/approvalHelpers.js normalizeRoleKey`. An account created
// with any other role could sign in and then reach nothing, so the set is
// closed here rather than left as free text.

const ROLE_KEYS = [
    'instructor',
    'program-head',
    'director-of-libraries',
    'industry-consultant',
    'dean',
    'vpaa',
    // Administers accounts and reads the audit trail. Created only by the bootstrap script or
    // by another superuser; self-registration never accepts it.
    'superuser'
];

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        user_id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

        // Display name, shown against every approval and comment this person
        // makes — "SURNAME, FIRSTNAME" to match the existing demo accounts.
        name: { type: DataTypes.STRING(120), allowNull: false },

        // The login identifier. Stored lower-cased (see the hook below) so
        // "Maria.Santos@unc.edu.ph" and "maria.santos@unc.edu.ph" are one
        // account and cannot be registered twice.
        email: {
            type: DataTypes.STRING(160),
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },

        // scrypt output, self-describing — see utils/password.js. Never a
        // plain or reversibly-encoded password.
        password_hash: { type: DataTypes.STRING(255), allowNull: false },

        role: {
            type: DataTypes.STRING(40),
            allowNull: false,
            validate: {
                isAllowedRole(value) {
                    if (!ROLE_KEYS.includes(value)) {
                        throw new Error(`role must be one of: ${ROLE_KEYS.join(', ')}`);
                    }
                }
            }
        },

        // A disabled account keeps its history (comments, approvals, the
        // signature on an approved plan) but can no longer sign in. Deleting
        // the row instead would orphan all of that.
        is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },

        last_login_at: { type: DataTypes.DATE, allowNull: true },

        // Credential flow. An admin-issued temporary password must be replaced at first sign-in
        // and stops working at temp_password_expires_at (72 hours after it was issued).
        must_change_password: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
        password_changed_at: { type: DataTypes.DATE, allowNull: true },
        temp_password_expires_at: { type: DataTypes.DATE, allowNull: true },

        // E-signature. The image is an AES-256-GCM encrypted file (utils/signatureStore.js); only
        // its random file name, mime type, IV, auth tag and key version are stored here.
        signature_path: { type: DataTypes.STRING(80), allowNull: true },
        signature_mime: { type: DataTypes.STRING(20), allowNull: true },
        signature_iv: { type: DataTypes.STRING(32), allowNull: true },
        signature_tag: { type: DataTypes.STRING(32), allowNull: true },
        signature_key_version: { type: DataTypes.INTEGER, allowNull: true },
        signature_updated_at: { type: DataTypes.DATE, allowNull: true },

        // Password reset. The RAW token is emailed/shown to the user and never
        // stored; only its SHA-256 lives here, so a copy of this table cannot
        // be used to reset anyone's password. Single outstanding reset per
        // account: asking for a new link invalidates the previous one.
        reset_token_hash: { type: DataTypes.STRING(64), allowNull: true },
        reset_expires_at: { type: DataTypes.DATE, allowNull: true }
    }, {
        tableName: 'Users',
        hooks: {
            beforeValidate(user) {
                if (typeof user.email === 'string') {
                    user.email = user.email.trim().toLowerCase();
                }
                if (typeof user.name === 'string') {
                    user.name = user.name.trim();
                }
            }
        },
        defaultScope: {
            // So a stray `User.findAll()` in some future controller cannot
            // leak password hashes or a live reset token into an API response
            // by accident.
            attributes: { exclude: ['password_hash', 'reset_token_hash', 'signature_path', 'signature_iv', 'signature_tag'] }
        },
        scopes: {
            // The login path has to see the hash, and asks for it explicitly.
            withSecret: { attributes: {} }
        }
    });

    User.ROLE_KEYS = ROLE_KEYS;

    // What is safe to send to a browser.
    User.prototype.toPublic = function toPublic() {
        return {
            id: this.user_id,
            name: this.name,
            email: this.email,
            role: this.role,
            isActive: this.is_active,
            mustChangePassword: Boolean(this.must_change_password)
        };
    };

    return User;
};

module.exports.ROLE_KEYS = ROLE_KEYS;
