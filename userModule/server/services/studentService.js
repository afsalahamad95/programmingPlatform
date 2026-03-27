import Student from "../models/Student.js";
import createError from "http-errors";
import mongoose from "mongoose";

export const getStudentById = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid student ID format");
    }

    const student = await Student.findById(id);
    if (!student) {
      throw createError(404, "Student not found");
    }
    return student;
  } catch (error) {
    if (error.name === "CastError") {
      throw createError(400, "Invalid student ID format");
    }
    throw error;
  }
};

/** Track user activity and update analytics */
export const trackActivity = async (id, action, metadata = {}) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid student ID format");
    }

    const update = {
      $push: {
        activityLog: {
          action,
          timestamp: new Date(),
          metadata,
        },
      },
      $set: {
        "analytics.lastActive": new Date(),
      },
      $inc: {
        points: metadata.points || 0,
        "analytics.totalTimeSpent": metadata.duration || 0,
      },
    };

    // If it's a skill-related activity, update skill progression
    if (metadata.skill && metadata.score) {
      update.$set[`analytics.skillProgression.${metadata.skill}`] = metadata.score;
    }

    const student = await Student.findByIdAndUpdate(id, update, { new: true });
    if (!student) {
      throw createError(404, "Student not found");
    }
    return student;
  } catch (error) {
    throw error;
  }
};

/** Get personalized recommendations based on student's profile */
export const getPersonalizedRecommendations = async (id) => {
  try {
    const student = await getStudentById(id);
    const { targetRole, preferences, learningGoals } = student;

    // Simple personalization logic: 
    // In a real app, this might call an LLM or use Vector search
    const recommendations = {
      rolePath: `Path to becoming a ${targetRole || 'Software Engineer'}`,
      suggestedTopics: preferences || ["General Programming"],
      priorityGoals: learningGoals || ["Complete your first technical test"],
      dashboardTiles: [
        { title: "Continue Learning", items: preferences.slice(0, 2) },
        { title: "Upcoming Goals", items: learningGoals.slice(0, 2) },
      ]
    };

    return recommendations;
  } catch (error) {
    throw error;
  }
};

export const createNewStudent = async (studentData) => {
  try {
    const student = new Student(studentData);
    await student.validate();
    return await student.save();
  } catch (error) {
    if (error.name === "ValidationError") {
      throw createError(400, error.message);
    }
    if (error.code === 11000) {
      throw createError(409, "Student with this email already exists");
    }
    throw error;
  }
};

export const updateStudentById = async (id, updateData) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid student ID format");
    }

    const student = await Student.findOneAndUpdate(
      { _id: id },
      { $set: updateData },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    );

    if (!student) {
      throw createError(404, "Student not found");
    }

    return student;
  } catch (error) {
    if (error.name === "ValidationError") {
      throw createError(400, error.message);
    }
    if (error.name === "CastError") {
      throw createError(400, "Invalid data format");
    }
    if (error.code === 11000) {
      throw createError(409, "Student with this email already exists");
    }
    throw error;
  }
};

export const deleteStudentById = async (id) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createError(400, "Invalid student ID format");
    }

    const student = await Student.findById(id);
    if (!student) {
      throw createError(404, "Student not found");
    }

    await student.deleteOne();
    return true;
  } catch (error) {
    if (error.name === "CastError") {
      throw createError(400, "Invalid student ID format");
    }
    throw error;
  }
};
/** Generate a human-like AI coaching insight based on recent activity */
export const getAICoachingInsight = async (id) => {
  const student = await getStudentById(id);
  const { activityLog, analytics, targetRole } = student;

  const recentFailures = activityLog.filter(a => a.action === 'TEST_FAILED').length;
  const recentStreaks = analytics?.streak || 0;
  
  let insight = `Keep pushing on your ${targetRole || 'engineering'} path!`;
  
  if (recentStreaks > 3) {
    insight = `Impressive! Your ${recentStreaks}-day streak puts you in the top 5% of learners. Ready for a harder challenge?`;
  } else if (recentFailures > 2) {
    insight = `I noticed some tricky hurdles lately. Don't worry! Try focusing on foundational concepts in the "Logic" section first.`;
  } else if (analytics.totalTimeSpent > 500) {
    insight = `You've spent over 8 hours mastering content this week. You're building solid muscle memory!`;
  }

  return {
    insight,
    prioritySkill: Object.entries(analytics?.skillProgression || {})
      .sort(([, a], [, b]) => a - b)[0]?.[0] || "General Logic",
    timestamp: new Date()
  };
};

/** Project future milestones based on current data velocity */
export const getPredictiveMilestone = async (id) => {
  const student = await getStudentById(id);
  const dailyPointsAvg = student.points / (Math.max(1, (new Date() - student.createdAt) / (1000 * 60 * 60 * 24)));
  
  const targetPoints = 5000; // Example goal for "Senior Level"
  const pointsRemaining = Math.max(0, targetPoints - student.points);
  const daysToGoal = Math.ceil(pointsRemaining / (dailyPointsAvg || 100));

  return {
    milestoneName: "Senior Developer Proficiency",
    targetPoints,
    daysRemaining: daysToGoal > 365 ? "365+" : daysToGoal,
    probabilityOfSuccess: Math.min(99, 70 + (student.analytics?.streak * 2)),
    nextBigSkill: "System Design"
  };
};
