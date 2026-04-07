import Student from "../models/Student.js";
import createError from "http-errors";
import mongoose from "mongoose";

// ─── Core CRUD ────────────────────────────────────────────────────────────────

export const getStudentById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, "Invalid student ID format");
  const student = await Student.findById(id);
  if (!student) throw createError(404, "Student not found");
  return student;
};

export const createNewStudent = async (studentData) => {
  try {
    const student = new Student(studentData);
    await student.validate();
    return await student.save();
  } catch (error) {
    if (error.name === "ValidationError") throw createError(400, error.message);
    if (error.code === 11000) throw createError(409, "Student with this email already exists");
    throw error;
  }
};

export const updateStudentById = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, "Invalid student ID format");
  const student = await Student.findOneAndUpdate(
    { _id: id },
    { $set: updateData },
    { new: true, runValidators: true, context: "query" }
  );
  if (!student) throw createError(404, "Student not found");
  return student;
};

export const deleteStudentById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, "Invalid student ID format");
  const student = await Student.findById(id);
  if (!student) throw createError(404, "Student not found");
  await student.deleteOne();
  return true;
};

// ─── Activity Tracking ────────────────────────────────────────────────────────

export const trackActivity = async (id, action, metadata = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) throw createError(400, "Invalid student ID format");

  const update = {
    $push: { activityLog: { action, timestamp: new Date(), metadata } },
    $set: { "analytics.lastActive": new Date() },
    $inc: {
      "basicInfo.points": metadata.points || 0,
      "analytics.totalTimeSpent": metadata.duration || 0,
    },
  };

  if (metadata.skill && typeof metadata.score === "number") {
    update.$set[`analytics.skillProgression.${metadata.skill}`] = metadata.score;
  }

  // Update daily streak: if last active was yesterday, increment; else reset
  const student = await Student.findById(id);
  if (student) {
    const now = new Date();
    const lastActive = student.analytics?.lastActive;
    if (lastActive) {
      const daysDiff = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      if (daysDiff === 1) {
        update.$inc["analytics.dailyStreak"] = 1;
      } else if (daysDiff > 1) {
        update.$set["analytics.dailyStreak"] = 1;
      }
    } else {
      update.$set["analytics.dailyStreak"] = 1;
    }
  }

  const updated = await Student.findByIdAndUpdate(id, update, { new: true });
  if (!updated) throw createError(404, "Student not found");
  return updated;
};

// ─── Recommendations ─────────────────────────────────────────────────────────

export const getPersonalizedRecommendations = async (id) => {
  const student = await getStudentById(id);
  const { preferences, basicInfo } = student;
  const learningGoals = preferences?.learningGoals ?? [];
  const prefs = preferences?.difficultyPreference ?? "Medium";

  return {
    rolePath: `Path to your goal (${prefs} difficulty)`,
    suggestedTopics: learningGoals.slice(0, 4),
    priorityGoals: learningGoals.slice(0, 2),
    nextMilestone: basicInfo.points < 500 ? "Earn 500 points" : basicInfo.points < 2000 ? "Earn 2,000 points" : "Reach Expert Level",
    dashboardTiles: [
      { title: "Continue Learning", items: learningGoals.slice(0, 2) },
      { title: "Upcoming Goals", items: learningGoals.slice(2, 4) },
    ],
  };
};

// ─── AI Coaching Insight ──────────────────────────────────────────────────────

export const getAICoachingInsight = async (id) => {
  const student = await getStudentById(id);
  const { activityLog, analytics, basicInfo } = student;

  const recentFailures = activityLog.filter((a) => a.action === "TEST_FAILED").length;
  const streak = analytics?.dailyStreak ?? 0;
  const timeSpent = analytics?.totalTimeSpent ?? 0;

  let insight = `Keep pushing toward your goal!`;
  let insightType = "neutral";

  if (streak >= 7) {
    insight = `Incredible! A ${streak}-day streak puts you in the top 5% of learners. Ready to level up the difficulty?`;
    insightType = "positive";
  } else if (streak >= 3) {
    insight = `Great momentum! Your ${streak}-day streak shows real commitment. Stay consistent!`;
    insightType = "positive";
  } else if (recentFailures >= 3) {
    insight = `I noticed some recent struggles — that's completely normal. Try revisiting foundational concepts before pushing forward.`;
    insightType = "constructive";
  } else if (timeSpent > 500) {
    insight = `You've accumulated over ${Math.floor(timeSpent / 60)} hours of practice. Solid muscle memory in the making!`;
    insightType = "positive";
  }

  const skillMap = Object.entries(analytics?.skillProgression?.toJSON?.() ?? analytics?.skillProgression ?? {});
  const weakestSkill = skillMap.sort(([, a], [, b]) => a - b)[0]?.[0] ?? "General Logic";
  const strongestSkill = skillMap.sort(([, a], [, b]) => b - a)[0]?.[0] ?? null;

  return {
    insight,
    insightType,
    prioritySkill: weakestSkill,
    strongestSkill,
    streak,
    totalTimeSpent: timeSpent,
    recentFailures,
    timestamp: new Date(),
  };
};

// ─── Predictive Milestones ────────────────────────────────────────────────────

export const getPredictiveMilestone = async (id) => {
  const student = await getStudentById(id);
  const points = student.basicInfo?.points ?? 0;
  const createdAt = student.createdAt ?? new Date();
  const daysSinceJoined = Math.max(1, (Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
  const dailyPointsAvg = points / daysSinceJoined;

  const milestones = [
    { name: "Junior Developer", target: 500 },
    { name: "Mid-Level Developer", target: 2000 },
    { name: "Senior Developer", target: 5000 },
    { name: "Expert / Architect", target: 10000 },
  ];

  const nextMilestone = milestones.find((m) => m.target > points) ?? milestones[milestones.length - 1];
  const pointsRemaining = Math.max(0, nextMilestone.target - points);
  const daysToGoal = Math.ceil(pointsRemaining / Math.max(dailyPointsAvg, 10));
  const streak = student.analytics?.dailyStreak ?? 0;

  return {
    milestoneName: nextMilestone.name,
    targetPoints: nextMilestone.target,
    currentPoints: points,
    pointsRemaining,
    daysRemaining: daysToGoal > 365 ? "365+" : daysToGoal,
    probabilityOfSuccess: Math.min(99, 60 + streak * 2 + Math.min(20, Math.floor(dailyPointsAvg * 2))),
    allMilestones: milestones.map((m) => ({
      name: m.name,
      target: m.target,
      achieved: points >= m.target,
      progress: Math.min(100, Math.round((points / m.target) * 100)),
    })),
    nextBigSkill: "System Design",
  };
};

// ─── Skill Analytics ─────────────────────────────────────────────────────────

export const getSkillAnalytics = async (id) => {
  const student = await getStudentById(id);
  const raw = student.analytics?.skillProgression;
  // skillProgression is a Map; convert to plain object
  const skillMap = raw instanceof Map ? Object.fromEntries(raw) : (raw?.toJSON?.() ?? raw ?? {});

  const skillRadar = Object.entries(skillMap).map(([skill, score]) => ({
    skill,
    score: Math.round(Number(score) * 100) / 100,
    level: score >= 80 ? "Expert" : score >= 60 ? "Proficient" : score >= 40 ? "Developing" : "Beginner",
  }));

  // Activity-based skill frequency
  const skillFrequency = {};
  for (const log of student.activityLog ?? []) {
    const skill = log.metadata?.skill;
    if (skill) skillFrequency[skill] = (skillFrequency[skill] ?? 0) + 1;
  }

  return {
    skillRadar,
    skillFrequency: Object.entries(skillFrequency)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count),
    topSkills: skillRadar.sort((a, b) => b.score - a.score).slice(0, 5),
    weakSkills: skillRadar.sort((a, b) => a.score - b.score).slice(0, 5),
    totalSkillsTracked: skillRadar.length,
    programmingLanguages: student.technicalSkills?.programmingLanguages ?? [],
    frameworks: student.technicalSkills?.frameworks ?? [],
    tools: student.technicalSkills?.tools ?? [],
  };
};

// ─── Activity Heatmap ────────────────────────────────────────────────────────

export const getActivityHeatmap = async (id) => {
  const student = await getStudentById(id);
  const log = student.activityLog ?? [];

  // Daily activity counts for the last 52 weeks (364 days)
  const now = new Date();
  const dayMap = {};

  for (const entry of log) {
    const ts = new Date(entry.timestamp);
    const daysAgo = Math.floor((now - ts) / (1000 * 60 * 60 * 24));
    if (daysAgo > 364) continue;
    const dateKey = ts.toISOString().split("T")[0];
    dayMap[dateKey] = (dayMap[dateKey] ?? 0) + 1;
  }

  // Build sorted array for heatmap
  const heatmap = Object.entries(dayMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Hourly distribution (0-23)
  const hourly = new Array(24).fill(0);
  for (const entry of log) {
    const h = new Date(entry.timestamp).getHours();
    hourly[h]++;
  }

  // Day-of-week distribution (0=Sun...6=Sat)
  const weekly = new Array(7).fill(0);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const entry of log) {
    const d = new Date(entry.timestamp).getDay();
    weekly[d]++;
  }

  // Action type breakdown
  const actionCounts = {};
  for (const entry of log) {
    actionCounts[entry.action] = (actionCounts[entry.action] ?? 0) + 1;
  }

  return {
    heatmap,
    hourlyDistribution: hourly.map((count, hour) => ({ hour, count })),
    weeklyDistribution: weekly.map((count, i) => ({ day: dayNames[i], count })),
    actionBreakdown: Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count),
    totalActivities: log.length,
    activeDays: Object.keys(dayMap).length,
  };
};

// ─── Performance Timeline ────────────────────────────────────────────────────

export const getPerformanceTimeline = async (id) => {
  const student = await getStudentById(id);
  const log = student.activityLog ?? [];

  // Group test scores by date
  const timeline = {};
  for (const entry of log) {
    const hasScore = typeof entry.metadata?.score === "number";
    if (!hasScore) continue;
    const dateKey = new Date(entry.timestamp).toISOString().split("T")[0];
    if (!timeline[dateKey]) timeline[dateKey] = { date: dateKey, scores: [], points: 0 };
    timeline[dateKey].scores.push(entry.metadata.score);
    timeline[dateKey].points += entry.metadata.points ?? 0;
  }

  const timelineArr = Object.values(timeline)
    .map(({ date, scores, points }) => ({
      date,
      avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
      attempts: scores.length,
      pointsEarned: points,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Cumulative points
  let cumulative = 0;
  const cumulativeTimeline = timelineArr.map((entry) => {
    cumulative += entry.pointsEarned;
    return { ...entry, cumulativePoints: cumulative };
  });

  // Rolling 7-day average score
  const rolling = cumulativeTimeline.map((entry, i) => {
    const window = cumulativeTimeline.slice(Math.max(0, i - 6), i + 1);
    const rollingAvg = window.reduce((acc, e) => acc + e.avgScore, 0) / window.length;
    return { ...entry, rollingAvgScore: Math.round(rollingAvg * 10) / 10 };
  });

  return {
    timeline: rolling,
    totalTests: timelineArr.reduce((a, b) => a + b.attempts, 0),
    overallAvgScore: timelineArr.length
      ? Math.round((timelineArr.reduce((a, b) => a + b.avgScore, 0) / timelineArr.length) * 10) / 10
      : 0,
    currentPoints: student.basicInfo?.points ?? 0,
    streak: student.analytics?.dailyStreak ?? 0,
  };
};
