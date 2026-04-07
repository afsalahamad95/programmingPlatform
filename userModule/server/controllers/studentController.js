import * as studentService from '../services/studentService.js';
import createError from 'http-errors';
import { validationResult } from 'express-validator';

export const getStudent = async (req, res, next) => {
  try {
    const student = await studentService.getStudentById(req.params.id);
    res.json(student);
  } catch (error) {
    next(error);
  }
};

export const createStudent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(400, { errors: errors.array() });
    }
    const student = await studentService.createNewStudent(req.body);
    res.status(201).json(student);
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw createError(400, { errors: errors.array() });
    }
    if (!req.body || Object.keys(req.body).length === 0) {
      throw createError(400, 'Update data is required');
    }
    const student = await studentService.updateStudentById(req.params.id, req.body);
    res.json(student);
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    await studentService.deleteStudentById(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
};

export const trackActivity = async (req, res, next) => {
  try {
    const { action, metadata } = req.body;
    const student = await studentService.trackActivity(req.params.id, action, metadata);
    res.json(student);
  } catch (error) {
    next(error);
  }
};

export const getRecommendations = async (req, res, next) => {
  try {
    const recommendations = await studentService.getPersonalizedRecommendations(req.params.id);
    res.json(recommendations);
  } catch (error) {
    next(error);
  }
};

export const getInsights = async (req, res, next) => {
  try {
    const insights = await studentService.getAICoachingInsight(req.params.id);
    res.json(insights);
  } catch (error) {
    next(error);
  }
};

export const getMilestones = async (req, res, next) => {
  try {
    const milestones = await studentService.getPredictiveMilestone(req.params.id);
    res.json(milestones);
  } catch (error) {
    next(error);
  }
};

export const getSkillAnalytics = async (req, res, next) => {
  try {
    const data = await studentService.getSkillAnalytics(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getActivityHeatmap = async (req, res, next) => {
  try {
    const data = await studentService.getActivityHeatmap(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getPerformanceTimeline = async (req, res, next) => {
  try {
    const data = await studentService.getPerformanceTimeline(req.params.id);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
