/**
 * This builds on the webServer of previous projects in that it exports the
 * current directory via webserver listing on a hard code (see portno below)
 * port. It also establishes a connection to the MongoDB named 'project6'.
 *
 * To start the webserver run the command:
 *    node webServer.js
 *
 * Note that anyone able to connect to localhost:portNo will be able to fetch
 * any file accessible to the current user in the current directory or any of
 * its children.
 *
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

    const photos = await Photo.find({ user_id: userId });

    const processedPhotos = await Promise.all(photos.map(async (photo) => {
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
          }
        };
      }));

      return {
        _id: photo._id,
        user_id: photo.user_id,
        file_name: photo.file_name,
        date_time: photo.date_time,
        comments: processedComments
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
    const photos = await Photo.find({ user_id: userId }).sort({ date_time: -1 }).limit(1);

    if (photos.length === 0) {
      return response.status(200).json({ photo: null });
    }

    const recentPhoto = photos[0];
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
    const photos = await Photo.find({ user_id: userId });

    if (photos.length === 0) {
      return response.status(200).json({ photo: null });
    }

    // Find the photo with the most comments
    let mostCommentedPhoto = photos[0];
    let maxComments = (mostCommentedPhoto.comments || []).length;

    for (let i = 1; i < photos.length; i++) {
      const commentCount = (photos[i].comments || []).length;
      if (commentCount > maxComments) {
        maxComments = commentCount;
        mostCommentedPhoto = photos[i];
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

const server = app.listen(3000, function () {
  const port = server.address().port;
  console.log(
    "Listening at http://localhost:" +
      port +
      " exporting the directory " +
      __dirname 
  );
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

app.post('/commentsOfPhoto/:photo_id', requireAuth, async (request, response) => {
  const photoId = request.params.photo_id;
  const text = (request.body.comment || '').trim();

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

    const newComment = {
      comment: text,
      date_time: new Date(),
      user_id: request.session.userId
    };

    photo.comments.push(newComment);
    await photo.save();

    return response.status(200).json({ success: true });
  } catch (err) {
    console.error('Error adding comment:', err);
    return response.status(500).send('Internal server error');
  }
});