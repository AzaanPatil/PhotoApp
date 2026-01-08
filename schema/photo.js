"use strict";

const mongoose = require("mongoose");

/**
 * Define the Mongoose Schema for a Comment.
 */
const commentSchema = new mongoose.Schema({
  // The text of the comment.
  comment: String,
  // The date and time when the comment was created.
  date_time: { type: Date, default: Date.now },
  // The ID of the user who created the comment.
  user_id: mongoose.Schema.Types.ObjectId,
  // Array of user IDs that are mentioned in this comment
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

/**
 * Define the Mongoose Schema for a Photo.
 * 
 * PHOTO SHARING SYSTEM:
 * - sharing_list: null = public (everyone can view)
 * - sharing_list: [] = private (only owner can view)  
 * - sharing_list: [userId1, userId2] = shared (owner + listed users can view)
 * 
 * This allows fine-grained control over photo visibility while maintaining
 * backwards compatibility with existing photos (null = public).
 */
const photoSchema = new mongoose.Schema({
  // Name of the file containing the photo (in the project6/images directory).
  file_name: String,
  // The date and time when the photo was added to the database.
  date_time: { type: Date, default: Date.now },
  // The ID of the user who created the photo.
  user_id: mongoose.Schema.Types.ObjectId,
  // Array of comment objects representing the comments made on this photo.
  comments: [commentSchema],
  // Array of user IDs who can view this photo. If null/undefined, photo is public.
  // If empty array, only owner can view. If populated, owner + listed users can view.
  sharing_list: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  // Array of user IDs who have liked this photo.
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

/**
 * Create a Mongoose Model for a Photo using the photoSchema.
 */
const Photo = mongoose.model("Photo", photoSchema);

/**
 * Make this available to our application.
 */
module.exports = Photo;
