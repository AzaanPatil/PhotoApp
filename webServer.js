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

const app = express();

const User = require("./schema/user.js");
const Photo = require("./schema/photo.js");
const SchemaInfo = require("./schema/schemaInfo.js");

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

    if (!user || user.password !== password) {
      return response.status(400).json({ error: 'Invalid login name or password' });
    }

    request.session.userId = user._id;
    request.session.login_name = user.login_name;
    request.session.first_name = user.first_name;

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

app.post('/admin/logout', (request, response) => {
  if (!request.session || !request.session.userId) {
    return response.status(400).json({ error: 'No user is currently logged in' });
  }

  return request.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return response.status(500).json({ error: 'Error logging out' });
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

app.get("/user/:id", async function (request, response) {
  const id = request.params.id;
  if(!mongoose.Types.ObjectId.isValid(id)) {
    console.log("Invalid user id format:" + id);
    response.status(400).send("Not found: ID is invalid");
    return;
  }

  try {
    const user = await User.findById(id, '_id first_name last_name location description occupation').lean();
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

      return {
        _id: photo._id,
        user_id: photo.user_id,
        file_name: photo.file_name,
        date_time: photo.date_time,
        comments: processedComments,
        sharing_list: photo.sharing_list // Include sharing info for frontend display
      };
    }));

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

    const newUser = new User({
      login_name: login_name.toLowerCase(),
      password,
      first_name,
      last_name,
      location,
      description,
      occupation
    });

    await newUser.save();

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

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Error adding comment:', err);
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