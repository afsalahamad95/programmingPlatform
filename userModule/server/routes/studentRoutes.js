import { Router } from 'express';
import { body } from 'express-validator';
import * as studentController from '../controllers/studentController.js';
import { validateRequest } from '../middleware/validate.js';

const router = Router();

const validateStudentData = [
  body('basicInfo.name').trim().notEmpty().withMessage('Name is required'),
  body('basicInfo.email').isEmail().withMessage('Valid email is required'),
  body('basicInfo.graduationYear').isInt({ min: 2000 }).withMessage('Valid graduation year is required'),
  body('basicInfo.branch').trim().notEmpty().withMessage('Branch is required'),
  body('basicInfo.university').trim().notEmpty().withMessage('University is required'),
  body('basicInfo.currentSemester').isInt({ min: 1, max: 8 }).withMessage('Valid semester is required'),
  validateRequest,
];

// Profile
router.get('/:id', studentController.getStudent);
router.post('/', validateStudentData, studentController.createStudent);
router.put('/:id', validateStudentData, studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

// Activity
router.post('/:id/activity', studentController.trackActivity);

// AI & Recommendations
router.get('/:id/recommendations', studentController.getRecommendations);
router.get('/:id/insights', studentController.getInsights);
router.get('/:id/milestones', studentController.getMilestones);

// Analytics
router.get('/:id/analytics/skills', studentController.getSkillAnalytics);
router.get('/:id/analytics/heatmap', studentController.getActivityHeatmap);
router.get('/:id/analytics/timeline', studentController.getPerformanceTimeline);

export default router;
