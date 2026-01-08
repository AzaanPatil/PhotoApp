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
  // Optional profile photo filename stored in /images
  profile_photo: String,
  // Optional personal website URL
  website: String,
  // UI theme preference: 'light' or 'dark'
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
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
