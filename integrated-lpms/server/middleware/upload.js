'use strict';

const multer = require('multer');

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB max
    files: 6,
  },
});

module.exports = {
  memoryUpload,
  uploadSingle: (field = 'file') => memoryUpload.single(field),
  uploadMultiple: (field = 'files', max = 4) => memoryUpload.array(field, max),
};
