"use strict";

const mongoose = require("mongoose");

/**
 * Define the Mongoose Schema for a User.
 */
const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  location: String,
  description: String,
  occupation: String,
  login_name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password_digest: {
    type: String,
    required: true,
  },
  salt: {
    type: String,
    required: true,
  },
  // Array of photo IDs that this user has favorited
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Photo' }],
});

/**
 * Create a Mongoose Model for a User using the userSchema.
 */
const User = mongoose.model("User", userSchema);

/**
 * Make this available to our application.
 */
module.exports = User;
