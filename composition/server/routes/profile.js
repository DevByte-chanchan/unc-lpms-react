const express = require('express');
const router = express.Router();
const controller = require('../controllers/profileController');

// Every route acts on the signed-in user only (req.user); none takes a user id.
router.get('/', controller.getProfile);
// Raw image bytes; a larger body is refused with 413 before it is read into memory.
router.put('/signature', express.raw({ type: ['image/png', 'image/jpeg'], limit: controller.MAX_BYTES }), controller.putSignature);
router.get('/signature', controller.getSignature);
router.delete('/signature', controller.deleteSignature);

module.exports = router;
