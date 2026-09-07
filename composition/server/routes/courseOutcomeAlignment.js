const express = require('express');
const router = express.Router();
const { getCourseProgramOutcomeAlignment, updateCourseProgramOutcomeAlignment } = require('../controllers/courseOutcomeAlignmentController');

router.get('/:pcId/:revNum', getCourseProgramOutcomeAlignment);
router.put('/:pcId/:revNum', updateCourseProgramOutcomeAlignment);

module.exports = router;