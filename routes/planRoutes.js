const express = require('express');
const router = express.Router();
const plansController = require('../controllers/plansController');

// GET all plans
router.get('/', plansController.getAllPlans);
router.get('/approvals',plansController.getApprovalsByStatus);
router.get('/applicant', plansController.getAllApplicantPlans);
router.put('/applicant/:id' ,plansController.updateApplicant);
router.put('/status/:id' ,plansController.updateApplicantStatus);
router.get('/:id',plansController.getPlanById);

module.exports = router;
