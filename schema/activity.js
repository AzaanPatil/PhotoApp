"use strict";

const mongoose = require("mongoose");

/**
 * Define the Mongoose Schema for an Activity.
 * Activities track user actions on the photo sharing site.
 */
const activitySchema = new mongoose.Schema({
  // The type of activity performed
  activity_type: {
    type: String,
    required: true,
    enum: ['photo_upload', 'comment_added', 'user_register', 'user_login', 'user_logout']
  },
  // The date and time when the activity occurred
  date_time: { type: Date, default: Date.now },
  // The ID of the user who performed the activity
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Additional data specific to the activity type
  activity_data: {
    // For photo_upload: photo_id, file_name
    // For comment_added: photo_id, comment_id, comment_text
    // For other activities: may be empty
    photo_id: mongoose.Schema.Types.ObjectId,
    file_name: String,
    comment_id: mongoose.Schema.Types.ObjectId,
    comment_text: String,
  }
});

/**
 * Create a Mongoose Model for an Activity using the activitySchema.
 */
const Activity = mongoose.model("Activity", activitySchema);

/**
 * Make this available to our application.
 */
module.exports = Activity;