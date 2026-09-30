'use strict';

const express = require('express');
const router = express.Router();

// The previous endpoint rendered arbitrary request HTML in a server-side
// Chromium process with unrestricted networking and no concurrency bound.
// The client already has a browser-only PDF fallback, so fail closed here
// instead of exposing the server's network and process authority.
router.post('/export-pdf', (req, res) => res.status(501).json({
  error: 'Server PDF rendering is disabled. Use the browser PDF export.'
}));

module.exports = router;
