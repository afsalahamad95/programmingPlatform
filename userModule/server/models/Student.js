import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    basicInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      graduationYear: { type: Number, required: true },
      branch: { type: String, required: true },
      university: { type: String, required: true },
      currentSemester: { type: Number, required: true },
      points: { type: Number, default: 0 },
    },
    technicalSkills: {
      programmingLanguages: [String],
      frameworks: [String],
      tools: [String],
    },
    projects: [
      {
        name: { type: String, required: true },
        role: { type: String, required: true },
        technologies: [String],
        startDate: { type: Date, required: true },
        endDate: Date,
        description: String,
        links: {
          github: String,
          live: String,
        },
      },
    ],
    achievements: [
      {
        title: { type: String, required: true },
        date: { type: Date, required: true },
        description: String,
      },
    ],
    certifications: [
      {
        name: { type: String, required: true },
        provider: { type: String, required: true },
        issueDate: { type: Date, required: true },
        expiryDate: Date,
        credentialUrl: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

const Student = mongoose.model("Student", studentSchema);
export default Student;
