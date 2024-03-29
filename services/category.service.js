const {
  invalidError,
  alreadyExistsError,
  invalidIdError,
  unprocessableError,
  itemNotFoundError,
} = require("../errors/db.error");
const Category = require("../models/category.model");
const { CastError } = require("mongoose");
const {
  getObjectId,
  checkId,
  getPaginatedItems,
  addConditionToCriteria,
} = require("./base.service");
const User = require("../models/user.model");

const getCategories = async (skip, limit, sortBy, order, name) => {
  try {
    let criteria = {};

    criteria = addConditionToCriteria(
      criteria,
      "name",
      name ? { $regex: new RegExp(`.*${name}.*`, "i") } : null
    );
    const categories = await getPaginatedItems(
      Category,
      skip,
      limit,
      sortBy,
      order,
      [
        {
          path: "creator",
          select: "username email description",
        },
        {
          path: "updater",
          select: "username email description",
        },
      ],
      criteria
    );
    return categories;
  } catch (error) {
    throw unprocessableError("Failed to retrieve categories");
  }
};

const getCategoryByNames = async (names) => {
  try {
    const categories = await Promise.all(
      names.map(async (name) => {
        const category = await Category.findOne({ name: name });
        if (!category) throw itemNotFoundError("Categories not found");
        return category._id;
      })
    );
    return categories;
  } catch (error) {
    throw itemNotFoundError("Categories not found");
  }
};

const createCategory = async (inputCategory, creatorId) => {
  try {
    await checkId(creatorId, User, `User with id ${creatorId} not found`);
    const category = new Category({
      ...inputCategory,
      creator: await getObjectId(creatorId),
      updater: null,
    });
    const savedCategory = await category.save();
    return savedCategory;
  } catch (error) {
    console.log("ERROR", error);
    if (error.name === "ValidationError") {
      throw invalidError("Validation Error: " + error.message);
    }
    if (error.code === 11000) {
      const duplicatedFields = Object.keys(error.keyPattern).join(" and ");
      const duplicateErrorMessage = `Category with ${duplicatedFields} already exists`;
      throw alreadyExistsError(`Duplicate Key Error: ${duplicateErrorMessage}`);
    }
    if (error instanceof CastError && error.path === "_id") {
      throw invalidIdError(
        `Invalid ID: ${error.value} is not a valid ObjectId`
      );
    }
    throw unprocessableError("Failed to create category");
  }
};

const updateCategory = async (id, updaterId, inputCategory) => {
  try {
    await checkId(id, Category, `Category with id ${id} not found`);
    const savedCategory = await Category.findByIdAndUpdate(
      id,
      {
        ...inputCategory,
        updater: await getObjectId(updaterId),
      },
      { new: true }
    );
    return savedCategory;
  } catch (error) {
    console.log("ERROR", error);
    if (error.name === "ValidationError") {
      throw invalidError("Validation Error: " + error.message);
    }
    if (error.code === 11000) {
      const duplicatedFields = Object.keys(error.keyPattern).join(" and ");
      const duplicateErrorMessage = `Category with ${duplicatedFields} already exists`;
      throw alreadyExistsError(`Duplicate Key Error: ${duplicateErrorMessage}`);
    }
    if (error instanceof CastError && error.path === "_id") {
      throw invalidIdError(
        `Invalid ID: ${error.value} is not a valid ObjectId`
      );
    }
    if (error.name === "INVALID_ID") {
      throw invalidIdError(error.message);
    }
    throw unprocessableError("Failed to update category");
  }
};

const deleteCategory = async (id, updaterId) => {
  try {
    await checkId(id, Category, `Category with id ${id} not found`);
    const savedCategory = await Category.findByIdAndUpdate(
      id,
      {
        isDeleted: "true",
        updater: await getObjectId(updaterId),
      },
      { new: true }
    );
    return savedCategory;
  } catch (error) {
    console.log("ERROR", error);
    if (error.name === "ValidationError") {
      throw invalidError("Validation Error: " + error.message);
    }
    if (error instanceof CastError && error.path === "_id") {
      throw invalidIdError(
        `Invalid ID: ${error.value} is not a valid ObjectId`
      );
    }
    if (error.name === "INVALID_ID") {
      throw invalidIdError(error.message);
    }
    throw unprocessableError("Failed to delete category");
  }
};

const checkDuplicateCategory = async (value) => {
  try {
    const category = await Category.findOne({
      $or: [{ name: value }],
    });
    return category;
  } catch (error) {
    throw unprocessableError("Failed check category duplicate");
  }
};

module.exports = {
  getCategories,
  getCategoryByNames,
  createCategory,
  updateCategory,
  deleteCategory,
  checkDuplicateCategory,
};
