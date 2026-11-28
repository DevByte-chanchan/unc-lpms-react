'use strict';

function errorHandler(err, _req, res, _next) {
  if (!err) return res.status(500).json({ error: 'Unknown server error' });
  const status = err.status || err.statusCode || 500;
  if (status >= 500) {
    console.error('[server error]', err);
  }
  const payload = { error: err.message || 'Internal Server Error' };
  if (err.details) payload.details = err.details;
  return res.status(status).json(payload);
}

module.exports = { errorHandler };
