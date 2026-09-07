const express = require('express');
const router = express.Router();
const { getCourseCriteriaByPcOffering, updateCourseCriteriaByPcOffering } = require('../controllers/courseCriteriaController');

router.get('/:pcId/:revNum', getCourseCriteriaByPcOffering);
router.put('/:pcId/:revNum', updateCourseCriteriaByPcOffering);

module.exports = router;