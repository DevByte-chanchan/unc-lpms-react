const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/learningPlanController');
const roleCheck = require('../middleware/roleCheck');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Routes
router.post('/', roleCheck, controller.createLearningPlan);
router.get('/', roleCheck, controller.getLearningPlans);
router.get('/:id', roleCheck, controller.getLearningPlan);

router.post('/:id/documents', roleCheck, upload.single('file'), controller.uploadDocument);
router.delete('/:id/documents/:docId', roleCheck, controller.deleteDocument);

router.post('/:id/submit', roleCheck, controller.submitLearningPlan);
router.post('/:id/review', roleCheck, controller.submitReview);
router.post('/:id/approve', roleCheck, controller.approveOrReturn);

module.exports = router;
