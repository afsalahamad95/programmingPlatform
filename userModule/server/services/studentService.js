import Student from "../presenter/Student.js";
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
