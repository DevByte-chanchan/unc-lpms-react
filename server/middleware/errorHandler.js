/**
 * Last-resort Express error handler. Keeps responses JSON-shaped so the
 * React fetch layer can always read `error.message`.
 */
export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.name || 'InternalError',
    message: err.message || 'Something went wrong.',
  });
}
