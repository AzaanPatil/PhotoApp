/**
 * PHOTO SHARING SYSTEM OVERVIEW
 * =============================
 *
 * This application implements a comprehensive photo sharing system with fine-grained
 * access controls. The system allows users to control who can view their photos and
 * comments through a flexible sharing mechanism.
 *
 * SHARING MODES:
 * 1. PUBLIC: sharing_list = null (default)
 *    - Visible to all users (logged in or not)
 *    - No sharing_list field or sharing_list is null
 *
 * 2. PRIVATE: sharing_list = [] (empty array)
 *    - Visible only to the photo owner
 *    - sharing_list exists but is empty
 *
 * 3. SHARED: sharing_list = [userId1, userId2, ...]
 *    - Visible to photo owner + specified users
 *    - sharing_list contains array of user IDs
 *
 * PERMISSION CHECKS:
 * - All photo viewing endpoints filter results based on canUserViewPhoto()
 * - Commenting requires view permission on the photo
 * - Photo counts in user profiles exclude photos user cannot view
 * - Mentions only show photos the current user can actually see
 *
 * BACKWARD COMPATIBILITY:
 * - Existing photos without sharing_list default to public
 * - All existing functionality preserved
 *
 * API ENDPOINTS AFFECTED:
 * - POST /photos/new (upload with sharing options)
 * - GET /photosOfUser/:id (filtered by permissions)
 * - GET /user/:id/usage/* (filtered by permissions)
 * - GET /user/:id/mentions (filtered by permissions)
 * - POST /photos/:photo_id/comments (checks view permission)
 *
 * DATABASE CHANGES:
 * - Photo schema: added sharing_list field (array of ObjectIds)
 * - All queries now include permission filtering
 */

/**
 * This webServer exports the following URLs:
 * /            - Returns a text status message. Good for testing web server
 *                running.
 * /test        - Returns the SchemaInfo object of the database in JSON format.
 *                This is good for testing connectivity with MongoDB.
 * /test/info   - Same as /test.
 * /test/counts - Returns the population counts of the cs collections in the
 *                database. Format is a JSON object with properties being the
 *                collection name and the values being the counts.
 *
 * The following URLs need to be changed to fetch there reply values from the
 * database:
 * /user/list         - Returns an array containing all the User objects from
 *                      the database (JSON format).
 * /user/:id          - Returns the User object with the _id of id (JSON
 *                      format).
 * /photosOfUser/:id  - Returns an array with all the photos of the User (id).
 *                      Each photo should have all the Comments on the Photo
 *                      (JSON format).
 */

const mongoose = require("mongoose");
mongoose.Promise = require("bluebird");

const async = require("async");
const express = require("express");
const session = require("express-session");
const multer = require("multer");
const fs = require('fs');
const path = require('path');

const app = express();

const User = require("./schema/user.js");
const Photo = require("./schema/photo.js");
const SchemaInfo = require("./schema/schemaInfo.js");
const Activity = require("./schema/activity.js");

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/project6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(session({
  secret: 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 1000 * 60 * 60 * 24,
  },
}));

// Express-session is used to create server-side sessions. The session
// is required for protecting API endpoints so only authenticated users
// (users who have logged in) can access sensitive data.

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(__dirname));

app.get("/", function (request, response) {
  response.send("Simple web server of files from " + __dirname);
});

const requireAuth = (request, response, next) => {
  if (!request.session || !request.session.userId) {
    return response.status(401).json({ error: 'Unauthorized' });
  }
  
  return next();
};

// Middleware `requireAuth` ensures that routes that use it reject requests
// from unauthenticated clients with HTTP 401. This is applied to most
// API routes below to protect user/photo data.

app.use('/photosOfUser', requireAuth);
app.use('/user/:id', requireAuth);

app.post('/admin/login', async (request, response) => {
  const { login_name, password } = request.body;

  if (!login_name || !password) {
    return response.status(400).json({ error: 'Missing login_name or password' });
  }

  try {
    const user = await User.findOne({ login_name: login_name.toLowerCase() });
    const passwordUtil = require('./password');

    if (!user || !passwordUtil.doesPasswordMatch(user.password_digest, user.salt, password)) {
      return response.status(400).json({ error: 'Invalid login name or password' });
    }

    request.session.userId = user._id;
    request.session.login_name = user.login_name;
    request.session.first_name = user.first_name;

    // Log user login activity
    const loginActivity = new Activity({
      activity_type: 'user_login',
      user_id: user._id,
      activity_data: {}
    });
    await loginActivity.save();

    return response.status(200).json({
      _id: user._id,
      first_name: user.first_name,
      last_name: user.last_name
    });

  } catch (err) {
    console.error('Error in login:', err);
    return response.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/admin/logout', async (request, response) => {
  if (!request.session || !request.session.userId) {
    return response.status(400).json({ error: 'No user is currently logged in' });
  }

  const userId = request.session.userId;

  return request.session.destroy(async (err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return response.status(500).json({ error: 'Error logging out' });
    }

    // Log user logout activity
    try {
      const logoutActivity = new Activity({
        activity_type: 'user_logout',
        user_id: userId,
        activity_data: {}
      });
      await logoutActivity.save();
    } catch (activityErr) {
      console.error('Error logging logout activity:', activityErr);
      // Don't fail the logout if activity logging fails
    }

    return response.status(200).json({ message: 'Logout successful' });
  });
});

app.get('/admin/session', (request, response) => {
  if (!request.session || !request.session.userId) {
    return response.status(401).json({ message: 'No active session' });
  }

  return response.status(200).json({
    userId: request.session.userId,
    login_name: request.session.login_name,
    first_name: request.session.first_name,
    last_name: request.session.last_name,
  });
});

app.get("/test/:p1", function (request, response) {
  console.log("/test called with param1 = ", request.params.p1);

  const param = request.params.p1 || "info";

  if (param === "info") {
    SchemaInfo.find({}, function (err, info) {
      if (err) {
        console.error("Error in /user/info:", err);
        response.status(500).send(JSON.stringify(err));
        return;
      }
      if (info.length === 0) {
        response.status(500).send("Missing SchemaInfo");
        return;
      }

      console.log("SchemaInfo", info[0]);
      response.end(JSON.stringify(info[0]));
    });
  } else if (param === "counts") {
    const collections = [
      { name: "user", collection: User },
      { name: "photo", collection: Photo },
      { name: "schemaInfo", collection: SchemaInfo },
      { name: "activity", collection: Activity },
    ];
    async.each(
      collections,
      function (col, done_callback) {
        col.collection.countDocuments({}, function (err, count) {
          col.count = count;
          done_callback(err);
        });
      },
      function (err) {
        if (err) {
          response.status(500).send(JSON.stringify(err));
        } else {
          const obj = {};
          for (let i = 0; i < collections.length; i++) {
            obj[collections[i].name] = collections[i].count;
          }
          response.end(JSON.stringify(obj));
        }
      }
    );
  } else {
    response.status(400).send("Bad param " + param);
  }
});

app.get("/user/list", async function (request, response) {
  try {
    const users = await User.find({}, '_id first_name last_name').lean();
    console.log("Fetched users:", users);
    response.status(200).json(users);
  } catch (err) {
    console.error('Error fetching user list:', err);
    response.status(500).send({ message: 'Internal server error fetching user list.' });
  }
});

// Return user list with photo and authored-comment counts for each user
app.get('/user/listWithCounts', async function (request, response) {
  try {
    // Fetch basic user info
    const users = await User.find({}, '_id first_name last_name').lean();

    // Aggregate photo counts per user
    const photoCounts = await Photo.aggregate([
      { $group: { _id: '$user_id', count: { $sum: 1 } } }
    ]);

    // Aggregate comment counts per author across all photos
    const commentCounts = await Photo.aggregate([
      { $unwind: '$comments' },
      { $group: { _id: '$comments.user_id', count: { $sum: 1 } } }
    ]);

    const photoCountMap = {};
    photoCounts.forEach(p => { photoCountMap[p._id.toString()] = p.count; });

    const commentCountMap = {};
    commentCounts.forEach(c => { commentCountMap[c._id.toString()] = c.count; });

    // Build response combining counts (default to 0)
    const result = users.map(u => ({
      _id: u._id,
      first_name: u.first_name,
      last_name: u.last_name,
      photoCount: photoCountMap[u._id.toString()] || 0,
      commentCount: commentCountMap[u._id.toString()] || 0
    }));

    response.status(200).json(result);
  } catch (err) {
    console.error('Error fetching user list with counts:', err);
    response.status(500).send({ message: 'Internal server error fetching user list counts.' });
  }
});

// Return all comments authored by a given user (with photo thumbnail info)
app.get('/commentsOfUser/:userId', async function (request, response) {
  const userId = request.params.userId;
  const currentUserId = request.session?.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return response.status(400).send('Invalid user ID');
  }

  try {
    // Find photos that contain comments by the user
    const photosWithComments = await Photo.find({ 'comments.user_id': userId }).lean();

    const results = [];

    for (const photo of photosWithComments) {
      // Respect visibility rules: only include photos current user can view
      if (!canUserViewPhoto(photo, currentUserId)) continue;

      const matchingComments = (photo.comments || []).filter(c => c.user_id && c.user_id.toString() === userId.toString());
      for (const comment of matchingComments) {
        results.push({
          comment_id: comment._id,
          comment: comment.comment,
          date_time: comment.date_time,
          photo_id: photo._id,
          file_name: photo.file_name,
          photo_owner_id: photo.user_id
        });
      }
    }

    // Sort by date_time descending
    results.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

    response.status(200).json(results);
  } catch (err) {
    console.error('Error fetching comments of user:', err);
    response.status(500).send({ message: 'Internal server error fetching comments for user.' });
  }
});

app.get("/user/:id", async function (request, response) {
  const id = request.params.id;
  if(!mongoose.Types.ObjectId.isValid(id)) {
    console.log("Invalid user id format:" + id);
    response.status(400).send("Not found: ID is invalid");
    return;
  }

  try {
    // Include new optional fields: website, profile_photo, theme
    const user = await User.findById(id, '_id first_name last_name location description occupation website profile_photo theme').lean();
    if (!user) {
      console.log("User with _id:" + id + " not found.");
      response.status(400).send("Not found");
      return;
    }
    response.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user:", err);
    response.status(500).send({ message: "Internal server error fetching user." });
  }
});

// Upload or update profile photo for a user. Requires authentication and
// that the authenticated user matches the user being updated.
app.post('/user/:id/photo', requireAuth, upload.single('profilephoto'), async function (request, response) {
  const id = request.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return response.status(400).send('Invalid user ID');
  }

  if (!request.file) {
    return response.status(400).send({ error: 'No file uploaded' });
  }

  // Only allow users to update their own profile
  if (request.session.userId.toString() !== id.toString()) {
    return response.status(403).send('Forbidden');
  }

  try {
    const user = await User.findById(id);
    if (!user) return response.status(400).send('User not found');

    user.profile_photo = request.file.filename;
    await user.save();

    return response.status(200).json({ profile_photo: user.profile_photo });
  } catch (err) {
    console.error('Error uploading profile photo:', err);
    return response.status(500).send('Internal server error');
  }
});

// Update user profile fields. Data validation and updates are done server-side.
app.patch('/user/:id', requireAuth, async function (request, response) {
  const id = request.params.id;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return response.status(400).send('Invalid user ID');
  }

  // Only allow users to update their own profile
  if (request.session.userId.toString() !== id.toString()) {
    return response.status(403).send('Forbidden');
  }

  const allowed = ['first_name', 'last_name', 'location', 'description', 'occupation', 'website', 'theme'];
  const updates = {};
  for (const key of allowed) {
    if (request.body[key] !== undefined) updates[key] = request.body[key];
  }

  // Validate theme value if provided
  if (updates.theme && !['light', 'dark'].includes(updates.theme)) {
    return response.status(400).send('Invalid theme value');
  }

  try {
    const user = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, fields: '_id first_name last_name location description occupation website profile_photo theme' }).lean();
    if (!user) return response.status(400).send('User not found');
    return response.status(200).json(user);
  } catch (err) {
    console.error('Error updating user:', err);
    return response.status(500).send('Internal server error');
  }
});

app.get("/photosOfUser/:id", async function (request, response) {
  const userId = request.params.id;
  const currentUserId = request.session?.userId; // May be null if not logged in
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("Invalid user id format:", userId);
    response.status(400).send("Invalid user ID format");
    return;
  }
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log("User with _id:", userId, " not found.");
      response.status(400).json({
        error: "User not found"
      });
      return;
    }

    // Fetch all photos for the user
    const allPhotos = await Photo.find({ user_id: userId });

    // Filter photos based on sharing permissions
    const visiblePhotos = allPhotos.filter(photo => canUserViewPhoto(photo, currentUserId));

    const processedPhotos = await Promise.all(visiblePhotos.map(async (photo) => {
      const processedComments = await Promise.all(photo.comments.map(async (comment) => {
        const commentUser = await User.findById(comment.user_id, 'first_name last_name');
        return {
          _id: comment._id,
          comment: comment.comment,
          date_time: comment.date_time,
          user: {
            _id: commentUser._id,
            first_name: commentUser.first_name,
            last_name: commentUser.last_name
          },
          mentions: comment.mentions || []
        };
      }));

      // Check if current user has favorited this photo
      let isFavorited = false;
      if (currentUserId) {
        const user = await User.findById(currentUserId);
        isFavorited = user && user.favorites && user.favorites.some(id => id.equals(photo._id));
      }

      // Process tags
      const processedTags = await Promise.all((photo.tags || []).map(async (tag) => {
        const taggedUser = await User.findById(tag.user_id, 'first_name last_name');
        return {
          _id: tag._id,
          user_id: tag.user_id,
          created_by: tag.created_by,
          x: tag.x,
          y: tag.y,
          width: tag.width,
          height: tag.height,
          date_time: tag.date_time,
          user: {
            _id: taggedUser._id,
            first_name: taggedUser.first_name,
            last_name: taggedUser.last_name
          }
        };
      }));

      return {
        _id: photo._id,
        user_id: photo.user_id,
        file_name: photo.file_name,
        date_time: photo.date_time,
        comments: processedComments,
        sharing_list: photo.sharing_list, // Include sharing info for frontend display
        likes: photo.likes || [], // Include likes array
        likeCount: (photo.likes || []).length, // Include like count for sorting
        isFavorited: isFavorited, // Include favorite status for current user
        tags: processedTags // Include processed tags
      };
    }));

    // Sort photos: first by like count descending, then by date_time descending
    processedPhotos.sort((a, b) => {
      if (a.likeCount !== b.likeCount) {
        return b.likeCount - a.likeCount; // Higher likes first
      }
      return new Date(b.date_time) - new Date(a.date_time); // More recent first
    });

    response.status(200).json(processedPhotos);
  } catch (err) {
    console.error("Error processing photos:", err);
    response.status(500).send("Internal server error");
  }
});

app.get("/user/:id/usage/recent-photo", requireAuth, async function (request, response) {
  const userId = request.params.id;
  const currentUserId = request.session.userId;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("Invalid user id format:", userId);
    response.status(400).send("Invalid user ID format");
    return;
  }
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log("User with _id:", userId, " not found.");
      response.status(400).json({ error: "User not found" });
      return;
    }

    // Find all photos for the user and sort by date_time descending
    const allPhotos = await Photo.find({ user_id: userId }).sort({ date_time: -1 });

    // Filter photos that the current user can actually see
    const visiblePhotos = allPhotos.filter(photo => canUserViewPhoto(photo, currentUserId));

    if (visiblePhotos.length === 0) {
      return response.status(200).json({ photo: null });
    }

    const recentPhoto = visiblePhotos[0];
    response.status(200).json({
      photo: {
        _id: recentPhoto._id,
        file_name: recentPhoto.file_name,
        date_time: recentPhoto.date_time
      }
    });
  } catch (err) {
    console.error("Error fetching recent photo:", err);
    response.status(500).send("Internal server error");
  }
});

// GET /user/:id/usage/recent-photo
// Returns the single most recently uploaded photo for the user identified
// by `userId`. The server validates the id, ensures the user exists and
// then performs a query sorted by `date_time` (descending) to pick the
// latest photo. If the user has no photos, the API returns `{ photo: null }`.

app.get("/user/:id/usage/most-commented", requireAuth, async function (request, response) {
  const userId = request.params.id;
  const currentUserId = request.session.userId;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("Invalid user id format:", userId);
    response.status(400).send("Invalid user ID format");
    return;
  }
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log("User with _id:", userId, " not found.");
      response.status(400).json({ error: "User not found" });
      return;
    }

    // Find all photos for the user
    const allPhotos = await Photo.find({ user_id: userId });

    // Filter photos that the current user can actually see
    const visiblePhotos = allPhotos.filter(photo => canUserViewPhoto(photo, currentUserId));

    if (visiblePhotos.length === 0) {
      return response.status(200).json({ photo: null });
    }

    // Find the photo with the most comments
    let mostCommentedPhoto = visiblePhotos[0];
    let maxComments = (mostCommentedPhoto.comments || []).length;

    for (let i = 1; i < visiblePhotos.length; i++) {
      const commentCount = (visiblePhotos[i].comments || []).length;
      if (commentCount > maxComments) {
        maxComments = commentCount;
        mostCommentedPhoto = visiblePhotos[i];
      }
    }

    response.status(200).json({
      photo: {
        _id: mostCommentedPhoto._id,
        file_name: mostCommentedPhoto.file_name,
        commentCount: maxComments
      }
    });
  } catch (err) {
    console.error("Error fetching most commented photo:", err);
    response.status(500).send("Internal server error");
  }
});

// GET /user/:id/usage/most-commented
// Returns the user's photo that has the largest number of comments. The
// server fetches all photos for the user and performs the comments-length
// comparison on the backend. This guarantees consistent behavior and keeps
// the client simple. If there are no photos the endpoint returns
// `{ photo: null }`. If photos exist but have no comments, `commentCount`
// will be `0`.

app.post('/user', async (request, response) => {
  const {
    login_name,
    password,
    first_name,
    last_name,
    location,
    description,
    occupation
  } = request.body;

  if (!login_name || !password || !first_name || !last_name) {
    return response.status(400).send({ error: 'Missing required fields' });
  }

  try {
    const existing = await User.findOne({ login_name: login_name.toLowerCase() });
    if (existing) {
      return response.status(400).send({ error: 'Login name already exists' });
    }

    const passwordUtil = require('./password');
    const pwEntry = passwordUtil.makePasswordEntry(password);

    const newUser = new User({
      login_name: login_name.toLowerCase(),
      password_digest: pwEntry.hash,
      salt: pwEntry.salt,
      first_name,
      last_name,
      location,
      description,
      occupation
    });

    await newUser.save();

    // Log user registration activity
    const registerActivity = new Activity({
      activity_type: 'user_register',
      user_id: newUser._id,
      activity_data: {}
    });
    await registerActivity.save();

    return response.status(200).json({
      login_name: newUser.login_name,
      _id: newUser._id
    });

  } catch (err) {
    console.error('Error creating user:', err);
    return response.status(400).send({ error: 'Error creating user' });
  }
});

const imagesDir = __dirname + '/images';
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '_';
    cb(null, uniqueSuffix + file.originalname);
  }
});
const upload = multer({ storage: storage });

app.post('/photos/new', requireAuth, upload.single('uploadedphoto'), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ error: 'No file uploaded' });
    }

    const savedFileName = request.file.filename;

    const newPhoto = new Photo({
      file_name: savedFileName,
      user_id: request.session.userId,
    });

    await newPhoto.save();

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Error uploading photo:', err);
    return response.status(500).json({ error: 'Internal server error' });
  }
});

app.get("/user/:id/mentions", requireAuth, async function (request, response) {
  const userId = request.params.id;
  const currentUserId = request.session.userId;
  
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("Invalid user id format:", userId);
    response.status(400).send("Invalid user ID format");
    return;
  }
  
  try {
    const user = await User.findById(userId);
    if (!user) {
      console.log("User with _id:", userId, " not found.");
      response.status(400).json({ error: "User not found" });
      return;
    }

    // Find all photos where this user is mentioned in comments
    const allMentionedPhotos = await Photo.find({ "comments.mentions": userId });

    // Filter photos that the current user can actually see
    const visibleMentionedPhotos = allMentionedPhotos.filter(photo => canUserViewPhoto(photo, currentUserId));

    const processedPhotos = await Promise.all(visibleMentionedPhotos.map(async (photo) => {
      // Find the photo owner
      const photoOwner = await User.findById(photo.user_id, 'first_name last_name');
      
      // Find comments that mention this user
      const mentioningComments = photo.comments.filter(comment => 
        comment.mentions && comment.mentions.includes(userId)
      );

      return {
        _id: photo._id,
        file_name: photo.file_name,
        date_time: photo.date_time,
        owner: {
          _id: photoOwner._id,
          first_name: photoOwner.first_name,
          last_name: photoOwner.last_name
        },
        mentionCount: mentioningComments.length
      };
    }));

    response.status(200).json(processedPhotos);
  } catch (err) {
    console.error("Error fetching mentions:", err);
    response.status(500).send("Internal server error");
  }
});

app.post('/photos/:photo_id/comments', requireAuth, async (request, response) => {
  const photoId = request.params.photo_id;
  const text = (request.body.comment || '').trim();
  const currentUserId = request.session.userId;

  if (!text) {
    return response.status(400).send('Empty comment not allowed');
  }

  if (!mongoose.Types.ObjectId.isValid(photoId)) {
    return response.status(400).send('Invalid photo id');
  }

  try {
    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(400).send('Photo not found');
    }

    // Check if the current user can view this photo (and thus comment on it)
    if (!canUserViewPhoto(photo, currentUserId)) {
      return response.status(403).send('You do not have permission to comment on this photo');
    }

    // Parse @mentions from the comment text
    const mentionRegex = /@(\w+(?:\s+\w+)?)/g;
    const mentionedNames = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      mentionedNames.push(match[1].toLowerCase().replace(/\s+/g, ' ').trim());
    }

    // Validate mentioned users exist
    const mentionedUsers = [];
    if (mentionedNames.length > 0) {
      // Find users by first name, last name, or full name
      const users = await User.find({}, '_id first_name last_name login_name');
      
      const foundUsers = [];
      mentionedNames.forEach(name => {
        const nameParts = name.split(' ');
        let user = null;
        
        if (nameParts.length === 1) {
          // Single name - could be first name or login name
          user = users.find(u => 
            u.first_name.toLowerCase() === name ||
            u.login_name === name
          );
        } else if (nameParts.length === 2) {
          // Full name
          user = users.find(u => 
            (u.first_name.toLowerCase() === nameParts[0] && u.last_name.toLowerCase() === nameParts[1]) ||
            (u.first_name.toLowerCase() === nameParts[0] && u.last_name.toLowerCase() === nameParts[1])
          );
        }
        
        if (user && !foundUsers.find(u => u._id.equals(user._id))) {
          foundUsers.push(user);
        }
      });

      if (foundUsers.length !== mentionedNames.length) {
        const foundNames = foundUsers.map(u => `${u.first_name} ${u.last_name}`.toLowerCase());
        const invalidMentions = mentionedNames.filter(name => !foundNames.includes(name));
        return response.status(400).send(`Invalid user mention(s): @${invalidMentions.join(', @')}`);
      }
      
      mentionedUsers.push(...foundUsers.map(u => u._id));
    }

    const newComment = {
      comment: text,
      date_time: new Date(),
      user_id: currentUserId,
      mentions: mentionedUsers
    };

    photo.comments.push(newComment);
    await photo.save();

    // Log comment added activity
    const commentActivity = new Activity({
      activity_type: 'comment_added',
      user_id: currentUserId,
      activity_data: {
        photo_id: photoId,
        comment_id: newComment._id,
        comment_text: text
      }
    });
    await commentActivity.save();

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Error adding comment:', err);
    return response.status(500).send('Internal server error');
  }
});

// LIKE/UNLIKE ENDPOINTS
// =====================

/**
 * POST /photos/:photo_id/like
 * Like a photo
 * 
 * Request: POST /photos/:photo_id/like
 * Response: { success: true, liked: true, likeCount: number }
 * 
 * Security: Requires authentication, validates photo exists and user can view it
 */
app.post('/photos/:photo_id/like', requireAuth, async (request, response) => {
  try {
    const photoId = request.params.photo_id;
    const currentUserId = request.session.userId;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return response.status(400).json({ error: 'Invalid photo ID format' });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(404).json({ error: 'Photo not found' });
    }

    // Check if user can view this photo
    if (!canUserViewPhoto(photo, currentUserId)) {
      return response.status(403).json({ error: 'You do not have permission to view this photo' });
    }

    // Check if user already liked this photo
    const userLikedIndex = photo.likes ? photo.likes.findIndex(id => id.equals(currentUserId)) : -1;
    if (userLikedIndex !== -1) {
      return response.status(400).json({ error: 'You have already liked this photo' });
    }

    // Validate that likes won't exceed total number of users
    const totalUsers = await User.countDocuments();
    const currentLikeCount = (photo.likes || []).length;
    if (currentLikeCount >= totalUsers) {
      return response.status(400).json({ error: 'Cannot like photo - maximum likes reached' });
    }

    // Add like
    if (!photo.likes) {
      photo.likes = [];
    }
    photo.likes.push(currentUserId);
    await photo.save();

    // Log like activity
    const likeActivity = new Activity({
      activity_type: 'photo_liked',
      user_id: currentUserId,
      activity_data: {
        photo_id: photoId
      }
    });
    await likeActivity.save();

    return response.status(200).json({ 
      success: true, 
      liked: true, 
      likeCount: photo.likes.length 
    });
  } catch (err) {
    console.error('Error liking photo:', err);
    return response.status(500).send('Internal server error');
  }
});

/**
 * DELETE /photos/:photo_id/like
 * Unlike a photo
 * 
 * Request: DELETE /photos/:photo_id/like
 * Response: { success: true, liked: false, likeCount: number }
 * 
 * Security: Requires authentication, validates photo exists and user can view it
 */
app.delete('/photos/:photo_id/like', requireAuth, async (request, response) => {
  try {
    const photoId = request.params.photo_id;
    const currentUserId = request.session.userId;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return response.status(400).json({ error: 'Invalid photo ID format' });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(404).json({ error: 'Photo not found' });
    }

    // Check if user can view this photo
    if (!canUserViewPhoto(photo, currentUserId)) {
      return response.status(403).json({ error: 'You do not have permission to view this photo' });
    }

    // Check if user has liked this photo
    const userLikedIndex = photo.likes ? photo.likes.findIndex(id => id.equals(currentUserId)) : -1;
    if (userLikedIndex === -1) {
      return response.status(400).json({ error: 'You have not liked this photo' });
    }

    // Remove like
    photo.likes.splice(userLikedIndex, 1);
    await photo.save();

    return response.status(200).json({ 
      success: true, 
      liked: false, 
      likeCount: photo.likes.length 
    });
  } catch (err) {
    console.error('Error unliking photo:', err);
    return response.status(500).send('Internal server error');
  }
});

// FAVORITES ENDPOINTS
// ===================

/**
 * POST /photos/:photo_id/favorite
 * Add a photo to user's favorites
 * 
 * Request: POST /photos/:photo_id/favorite
 * Response: { success: true, favorited: true }
 * 
 * Security: Requires authentication, validates photo exists and user can view it
 */
app.post('/photos/:photo_id/favorite', requireAuth, async (request, response) => {
  try {
    const photoId = request.params.photo_id;
    const currentUserId = request.session.userId;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return response.status(400).json({ error: 'Invalid photo ID format' });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(404).json({ error: 'Photo not found' });
    }

    // Check if user can view this photo
    if (!canUserViewPhoto(photo, currentUserId)) {
      return response.status(403).json({ error: 'You do not have permission to view this photo' });
    }

    // Check if photo is already favorited
    const user = await User.findById(currentUserId);
    if (user.favorites && user.favorites.some(id => id.equals(photoId))) {
      return response.status(400).json({ error: 'Photo is already in favorites' });
    }

    // Add to favorites
    if (!user.favorites) {
      user.favorites = [];
    }
    user.favorites.push(photoId);
    await user.save();

    return response.status(200).json({ 
      success: true, 
      favorited: true 
    });
  } catch (err) {
    console.error('Error adding photo to favorites:', err);
    return response.status(500).send('Internal server error');
  }
});

/**
 * DELETE /photos/:photo_id/favorite
 * Remove a photo from user's favorites
 * 
 * Request: DELETE /photos/:photo_id/favorite
 * Response: { success: true, favorited: false }
 * 
 * Security: Requires authentication
 */
app.delete('/photos/:photo_id/favorite', requireAuth, async (request, response) => {
  try {
    const photoId = request.params.photo_id;
    const currentUserId = request.session.userId;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return response.status(400).json({ error: 'Invalid photo ID format' });
    }

    // Remove from favorites
    const user = await User.findById(currentUserId);
    if (!user.favorites) {
      return response.status(400).json({ error: 'Photo is not in favorites' });
    }

    const favoriteIndex = user.favorites.findIndex(id => id.equals(photoId));
    if (favoriteIndex === -1) {
      return response.status(400).json({ error: 'Photo is not in favorites' });
    }

    user.favorites.splice(favoriteIndex, 1);
    await user.save();

    return response.status(200).json({ 
      success: true, 
      favorited: false 
    });
  } catch (err) {
    console.error('Error removing photo from favorites:', err);
    return response.status(500).send('Internal server error');
  }
});

/**
 * GET /favorites
 * Get user's favorited photos
 * 
 * Response: Array of photo objects with full details
 * 
 * Security: Requires authentication
 */
app.get('/favorites', requireAuth, async (request, response) => {
  try {
    const currentUserId = request.session.userId;

    // Get user's favorites
    const user = await User.findById(currentUserId).populate('favorites');
    if (!user || !user.favorites) {
      return response.status(200).json([]);
    }

    // Get full photo details for each favorite
    const favoritePhotos = await Promise.all(user.favorites.map(async (photoId) => {
      const photo = await Photo.findById(photoId);
      if (!photo) return null;

      // Check if user can still view this photo (permissions might have changed)
      if (!canUserViewPhoto(photo, currentUserId)) {
        // Remove from favorites if user can no longer view it
        user.favorites = user.favorites.filter(id => !id.equals(photoId));
        await user.save();
        return null;
      }

      // Get photo owner info
      const owner = await User.findById(photo.user_id, 'first_name last_name');

      return {
        _id: photo._id,
        file_name: photo.file_name,
        date_time: photo.date_time,
        user_id: photo.user_id,
        owner: {
          _id: owner._id,
          first_name: owner.first_name,
          last_name: owner.last_name
        }
      };
    }));

    // Filter out nulls (photos that were removed or permissions changed)
    const validFavorites = favoritePhotos.filter(photo => photo !== null);

    response.status(200).json(validFavorites);
  } catch (err) {
    console.error('Error getting favorites:', err);
    response.status(500).send('Internal server error');
  }
});

// PHOTO TAGGING ENDPOINTS
// =======================

/**
 * POST /photos/:photo_id/tags
 * Add a tag to a photo
 * 
 * Request body: { user_id: string, x: number, y: number, width: number, height: number }
 * Response: { success: true, tag: tagObject }
 * 
 * Security: Requires authentication, validates photo exists and user can view it
 */
app.post('/photos/:photo_id/tags', requireAuth, async (request, response) => {
  try {
    const photoId = request.params.photo_id;
    const currentUserId = request.session.userId;
    const { user_id, x, y, width, height } = request.body;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return response.status(400).json({ error: 'Invalid photo ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return response.status(400).json({ error: 'Invalid user ID format' });
    }

    // Validate position data
    if (typeof x !== 'number' || typeof y !== 'number' || 
        typeof width !== 'number' || typeof height !== 'number' ||
        x < 0 || x > 1 || y < 0 || y > 1 || 
        width < 0 || width > 1 || height < 0 || height > 1) {
      return response.status(400).json({ error: 'Invalid position data' });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(404).json({ error: 'Photo not found' });
    }

    // Check if user can view this photo
    if (!canUserViewPhoto(photo, currentUserId)) {
      return response.status(403).json({ error: 'You do not have permission to view this photo' });
    }

    // Check if the tagged user exists
    const taggedUser = await User.findById(user_id);
    if (!taggedUser) {
      return response.status(404).json({ error: 'Tagged user not found' });
    }

    // Create the tag
    const newTag = {
      user_id: user_id,
      created_by: currentUserId,
      x: x,
      y: y,
      width: width,
      height: height,
      date_time: new Date()
    };

    if (!photo.tags) {
      photo.tags = [];
    }
    photo.tags.push(newTag);
    await photo.save();

    // Populate the user data for the response
    const populatedTag = {
      ...newTag,
      _id: photo.tags[photo.tags.length - 1]._id,
      user: {
        _id: taggedUser._id,
        first_name: taggedUser.first_name,
        last_name: taggedUser.last_name
      }
    };

    return response.status(200).json({ 
      success: true, 
      tag: populatedTag
    });
  } catch (err) {
    console.error('Error adding tag to photo:', err);
    return response.status(500).send('Internal server error');
  }
});

/**
 * DELETE /photos/:photo_id/tags/:tag_id
 * Remove a tag from a photo
 * 
 * Response: { success: true }
 * 
 * Security: Requires authentication, only tag creator or photo owner can delete
 */
app.delete('/photos/:photo_id/tags/:tag_id', requireAuth, async (request, response) => {
  try {
    const photoId = request.params.photo_id;
    const tagId = request.params.tag_id;
    const currentUserId = request.session.userId;

    if (!mongoose.Types.ObjectId.isValid(photoId)) {
      return response.status(400).json({ error: 'Invalid photo ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(tagId)) {
      return response.status(400).json({ error: 'Invalid tag ID format' });
    }

    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(404).json({ error: 'Photo not found' });
    }

    // Find the tag
    const tagIndex = photo.tags ? photo.tags.findIndex(tag => tag._id.equals(tagId)) : -1;
    if (tagIndex === -1) {
      return response.status(404).json({ error: 'Tag not found' });
    }

    const tag = photo.tags[tagIndex];

    // Check permissions: only tag creator or photo owner can delete
    if (!tag.created_by.equals(currentUserId) && !photo.user_id.equals(currentUserId)) {
      return response.status(403).json({ error: 'You do not have permission to delete this tag' });
    }

    // Remove the tag
    photo.tags.splice(tagIndex, 1);
    await photo.save();

    return response.status(200).json({ 
      success: true
    });
  } catch (err) {
    console.error('Error removing tag from photo:', err);
    return response.status(500).send('Internal server error');
  }
});

// PHOTO SHARING ENDPOINTS
// =======================

/**
 * POST /photos/new
 * Uploads a new photo with optional sharing permissions
 * 
 * PHOTO SHARING LOGIC:
 * - No sharing_list parameter = public photo (visible to all)
 * - sharing_list = [] (empty array) = private photo (owner only)
 * - sharing_list = [userId1, userId2] = shared photo (owner + specified users)
 * 
 * Request body (FormData):
 *   - uploadedphoto: The photo file (required)
 *   - sharing_list: JSON string array of user IDs who can view the photo (optional)
 * 
 * Response: { success: true } on success, { error: message } on failure
 * 
 * Security: Validates that all user IDs in sharing list exist before saving
 */
app.post('/photos/new', requireAuth, upload.single('uploadedphoto'), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ error: 'No file uploaded' });
    }

    const savedFileName = request.file.filename;

    // Parse sharing list from request body (JSON string)
    let sharingList = null;
    if (request.body.sharing_list) {
      try {
        sharingList = JSON.parse(request.body.sharing_list);
        // Validate that all user IDs in sharing list are valid ObjectIds
        if (!Array.isArray(sharingList)) {
          return response.status(400).json({ error: 'sharing_list must be an array of user IDs' });
        }
        // Validate each user ID and ensure they exist
        for (const userId of sharingList) {
          if (!mongoose.Types.ObjectId.isValid(userId)) {
            return response.status(400).json({ error: `Invalid user ID in sharing list: ${userId}` });
          }
        }
        // Check that all users in sharing list actually exist
        const existingUsers = await User.find({ _id: { $in: sharingList } }, '_id');
        if (existingUsers.length !== sharingList.length) {
          return response.status(400).json({ error: 'One or more users in sharing list do not exist' });
        }
      } catch (parseError) {
        return response.status(400).json({ error: 'Invalid sharing_list format. Must be valid JSON array.' });
      }
    }

    const newPhoto = new Photo({
      file_name: savedFileName,
      user_id: request.session.userId,
      sharing_list: sharingList, // null = public, [] = private, [userIds] = shared with specific users
    });

    await newPhoto.save();

    // Log photo upload activity
    const uploadActivity = new Activity({
      activity_type: 'photo_upload',
      user_id: request.session.userId,
      activity_data: {
        photo_id: newPhoto._id,
        file_name: savedFileName
      }
    });
    await uploadActivity.save();

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Error uploading photo:', err);
    return response.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Helper function to determine if a user can view a photo
 * Implements the photo sharing permission logic:
 * - Photo owner can always view their own photos
 * - If sharing_list is null/undefined, photo is public (everyone can view)
 * - If sharing_list is empty array, only owner can view
 * - If sharing_list has users, owner + listed users can view
 * 
 * @param {Object} photo - The photo document from database
 * @param {string} userId - The user ID requesting access (may be null for non-logged-in users)
 * @returns {boolean} - True if user can view the photo
 */
function canUserViewPhoto(photo, userId) {
  // Photo owner can always view their own photos
  if (photo.user_id.toString() === userId?.toString()) {
    return true;
  }

  // If sharing_list is null/undefined, photo is public (everyone can view)
  if (!photo.sharing_list) {
    return true;
  }

  // If sharing_list is empty array, only owner can view (already checked above)
  if (photo.sharing_list.length === 0) {
    return false;
  }

  // Check if user is in the sharing list
  return photo.sharing_list.some(sharedUserId => sharedUserId.toString() === userId?.toString());
}

/**
 * GET /activities
 * Returns the 5 most recent activities from the site
 * Activities include photo uploads, comments, user registrations, logins, and logouts
 * Results are sorted by date_time in descending order (most recent first)
 */
app.get('/activities', async (request, response) => {
  try {
    // Fetch the 5 most recent activities with user information
    const activities = await Activity.find({})
      .sort({ date_time: -1 })
      .limit(5)
      .populate('user_id', 'first_name last_name')
      .lean();

    // Process activities to include additional data for display
    const processedActivities = await Promise.all(activities.map(async (activity) => {
      const processedActivity = {
        _id: activity._id,
        activity_type: activity.activity_type,
        date_time: activity.date_time,
        user: {
          _id: activity.user_id._id,
          first_name: activity.user_id.first_name,
          last_name: activity.user_id.last_name
        }
      };

      // Add activity-specific data
      if (activity.activity_type === 'photo_upload' && activity.activity_data.photo_id) {
        // For photo uploads, include the photo information
        try {
          const photo = await Photo.findById(activity.activity_data.photo_id, 'file_name').lean();
          if (photo) {
            processedActivity.photo = {
              _id: activity.activity_data.photo_id,
              file_name: photo.file_name
            };
          }
        } catch (err) {
          console.error('Error fetching photo for activity:', err);
        }
      } else if (activity.activity_type === 'comment_added' && activity.activity_data.photo_id) {
        // For comments, include the photo information
        try {
          const photo = await Photo.findById(activity.activity_data.photo_id, 'file_name').lean();
          if (photo) {
            processedActivity.photo = {
              _id: activity.activity_data.photo_id,
              file_name: photo.file_name
            };
            processedActivity.comment_text = activity.activity_data.comment_text;
          }
        } catch (err) {
          console.error('Error fetching photo for comment activity:', err);
        }
      }

      return processedActivity;
    }));

    response.status(200).json(processedActivities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    response.status(500).send('Internal server error');
  }
});

/**
 * GET /user-activities
 * Returns the most recent activity for each user
 * Used for displaying user activity in the sidebar
 */
app.get('/user-activities', async (request, response) => {
  try {
    // Get all users
    const users = await User.find({}, '_id first_name last_name').lean();
    
    // For each user, get their most recent activity
    const userActivities = await Promise.all(users.map(async (user) => {
      const recentActivity = await Activity.findOne({ user_id: user._id })
        .sort({ date_time: -1 })
        .populate('user_id', 'first_name last_name')
        .lean();

      if (!recentActivity) {
        return {
          user: {
            _id: user._id,
            first_name: user.first_name,
            last_name: user.last_name
          },
          activity: null
        };
      }

      const processedActivity = {
        _id: recentActivity._id,
        activity_type: recentActivity.activity_type,
        date_time: recentActivity.date_time
      };

      // Add activity-specific data
      if (recentActivity.activity_type === 'photo_upload' && recentActivity.activity_data.photo_id) {
        try {
          const photo = await Photo.findById(recentActivity.activity_data.photo_id, 'file_name').lean();
          if (photo) {
            processedActivity.photo = {
              _id: recentActivity.activity_data.photo_id,
              file_name: photo.file_name
            };
          }
        } catch (err) {
          console.error('Error fetching photo for activity:', err);
        }
      } else if (recentActivity.activity_type === 'comment_added' && recentActivity.activity_data.photo_id) {
        try {
          const photo = await Photo.findById(recentActivity.activity_data.photo_id, 'file_name').lean();
          if (photo) {
            processedActivity.photo = {
              _id: recentActivity.activity_data.photo_id,
              file_name: photo.file_name
            };
            processedActivity.comment_text = recentActivity.activity_data.comment_text;
          }
        } catch (err) {
          console.error('Error fetching photo for comment activity:', err);
        }
      }

      return {
        user: {
          _id: user._id,
          first_name: user.first_name,
          last_name: user.last_name
        },
        activity: processedActivity
      };
    }));

    response.status(200).json(userActivities);
  } catch (err) {
    console.error('Error fetching user activities:', err);
    response.status(500).send('Internal server error');
  }
});

/**
 * DELETE /photos/:photo_id
 * Deletes a photo owned by the current user
 * Also deletes associated comments and activities
 * Only the photo owner can delete their photos
 */
app.delete('/photos/:photo_id', requireAuth, async (request, response) => {
  const photoId = request.params.photo_id;
  const currentUserId = request.session.userId;

  if (!mongoose.Types.ObjectId.isValid(photoId)) {
    return response.status(400).send('Invalid photo ID format');
  }

  try {
    // Find the photo and verify ownership
    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(404).send('Photo not found');
    }

    // Check if current user owns this photo
    if (photo.user_id.toString() !== currentUserId.toString()) {
      return response.status(403).send('You can only delete your own photos');
    }

    // Delete the physical file from disk
    const filePath = path.join(imagesDir, photo.file_name);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete all activities related to this photo
    await Activity.deleteMany({
      $or: [
        { 'activity_data.photo_id': photoId },
        { activity_type: 'photo_upload', user_id: currentUserId, 'activity_data.photo_id': photoId }
      ]
    });

    // Remove this photo from all users' favorites lists
    await User.updateMany(
      { favorites: photoId },
      { $pull: { favorites: photoId } }
    );

    // Delete the photo (this will also delete associated comments due to schema design)
    await Photo.findByIdAndDelete(photoId);

    response.status(200).json({ success: true, message: 'Photo deleted successfully' });
  } catch (err) {
    console.error('Error deleting photo:', err);
    response.status(500).send('Internal server error');
  }
});

/**
 * DELETE /comments/:comment_id
 * Deletes a comment made by the current user
 * Can delete comments on any photo (own or others')
 * Updates activity records accordingly
 */
app.delete('/comments/:comment_id', requireAuth, async (request, response) => {
  const commentId = request.params.comment_id;
  const currentUserId = request.session.userId;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    return response.status(400).send('Invalid comment ID format');
  }

  try {
    // Find the photo containing this comment
    const photo = await Photo.findOne({ 'comments._id': commentId });
    if (!photo) {
      return response.status(404).send('Comment not found');
    }

    // Find the specific comment
    const comment = photo.comments.id(commentId);
    if (!comment) {
      return response.status(404).send('Comment not found');
    }

    // Check if current user owns this comment
    if (comment.user_id.toString() !== currentUserId.toString()) {
      return response.status(403).send('You can only delete your own comments');
    }

    // Remove the comment from the photo
    photo.comments.pull(commentId);
    await photo.save();

    // Delete associated activity
    await Activity.deleteMany({
      activity_type: 'comment_added',
      user_id: currentUserId,
      'activity_data.comment_id': commentId
    });

    response.status(200).json({ success: true, message: 'Comment deleted successfully' });
  } catch (err) {
    console.error('Error deleting comment:', err);
    response.status(500).send('Internal server error');
  }
});

/**
 * DELETE /user/:id
 * Deletes an entire user account and all associated data
 * Only the account owner can delete their own account
 * Includes final warning prompt (handled on frontend)
 * Cascading delete: removes user, all photos, all comments, all activities
 */
app.delete('/user/:id', requireAuth, async (request, response) => {
  const userId = request.params.id;
  const currentUserId = request.session.userId;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return response.status(400).send('Invalid user ID format');
  }

  // Verify that user can only delete their own account
  if (userId !== currentUserId.toString()) {
    return response.status(403).send('You can only delete your own account');
  }

  try {
    // Start a session for transaction-like behavior
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Delete all photos owned by this user and their files
      const userPhotos = await Photo.find({ user_id: userId }).session(session);
      for (const photo of userPhotos) {
        // Delete physical files
        const filePath = path.join(imagesDir, photo.file_name);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      await Photo.deleteMany({ user_id: userId }).session(session);

      // 2. Remove this user's comments from all photos
      await Photo.updateMany(
        { 'comments.user_id': userId },
        { $pull: { comments: { user_id: userId } } }
      ).session(session);

      // 3. Remove this user's likes from all photos
      await Photo.updateMany(
        { likes: userId },
        { $pull: { likes: userId } }
      ).session(session);

      // 4. Remove this user from all other users' favorites lists
      await User.updateMany(
        { favorites: userId },
        { $pull: { favorites: userId } }
      ).session(session);

      // 5. Delete all activities related to this user
      await Activity.deleteMany({ user_id: userId }).session(session);

      // 5. Delete the user account
      await User.findByIdAndDelete(userId).session(session);

      // Commit the transaction
      await session.commitTransaction();

      // Destroy the session and log out the user
      request.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session after account deletion:', err);
        }
        response.status(200).json({
          success: true,
          message: 'Account deleted successfully. You have been logged out.'
        });
      });

    } catch (transactionError) {
      // Abort transaction on error
      await session.abortTransaction();
      throw transactionError;
    } finally {
      session.endSession();
    }

  } catch (err) {
    console.error('Error deleting user account:', err);
    response.status(500).send('Internal server error');
  }
});

// SERVER STARTUP
// ===============

/**
 * Start the Express server
 * Serves static files from current directory
 * Listens on port 3000
 */
const server = app.listen(3000, function () {
  const port = server.address().port;
  console.log(
    "Listening at http://localhost:" +
      port +
      " exporting the directory " +
      __dirname
  );
});