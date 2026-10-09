'use strict';

// HTTP security settings for the API: security headers (helmet), the session cookie's flags, and
// which proxy headers to believe. The API serves JSON and one encrypted signature image, never a
// web page; the client (Vite) is a separate origin that fetches it, so these headers do not touch it.

const helmet = require('helmet');

// LPMS_TRUST_PROXY: how many reverse proxies stand in front of the API (1 = one proxy). Unset or
// "false" trusts none, so X-Forwarded-* headers from a client are ignored. Also accepts what Express
// accepts: loopback, linklocal, uniquelocal, or a comma-separated list of addresses / subnets.
// Trusting too much lets a caller forge their address and the "https" flag.
const parseTrustProxy = (value) => {
    const text = String(value ?? '').trim();
    if (!text || /^(false|0|no|off)$/i.test(text)) return false;
    if (/^(true|yes|on)$/i.test(text)) return 1;
    if (/^\d+$/.test(text)) return Number(text);
    return text;
};

// LPMS_COOKIE_SECURE: "true" always marks the session cookie Secure; "false" never does; anything
// else (the default, "auto") marks it Secure in production or when this request arrived over https.
// So plain http on localhost keeps working in development, and a production deployment is Secure.
const cookieSecure = (req, env = process.env) => {
    const setting = String(env.LPMS_COOKIE_SECURE ?? '').trim().toLowerCase();
    if (setting === 'true') return true;
    if (setting === 'false') return false;
    return env.NODE_ENV === 'production' || req?.secure === true;
};

const sessionCookieOptions = (req, { maxAge, env = process.env } = {}) => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: cookieSecure(req, env),
    path: '/',
    ...(maxAge == null ? {} : { maxAge })
});

// The API returns JSON: nothing on its responses should load, run or be framed.
const apiContentSecurityPolicy = {
    useDefaults: false,
    directives: {
        defaultSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
        frameAncestors: ["'none'"]
    }
};

// HSTS only on responses that really went over https (req.secure honours the trust-proxy setting).
// Sent over plain http it would be ignored by browsers anyway, and it must never be implied to a
// plain-http localhost setup.
const hstsWhenSecure = (req, res, next) => {
    if (req.secure) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    next();
};

const applySecurity = (app, env = process.env) => {
    app.set('trust proxy', parseTrustProxy(env.LPMS_TRUST_PROXY));
    app.disable('x-powered-by');
    app.use(helmet({
        contentSecurityPolicy: apiContentSecurityPolicy,
        hsts: false,
        // The client at another port of the same host fetches the signature image through fetch()+CORS;
        // "same-site" lets same-site embeds work and still blocks other sites.
        crossOriginResourcePolicy: { policy: 'same-site' },
        referrerPolicy: { policy: 'no-referrer' }
    }));
    app.use(hstsWhenSecure);
};

module.exports = { parseTrustProxy, cookieSecure, sessionCookieOptions, applySecurity, hstsWhenSecure, apiContentSecurityPolicy };
