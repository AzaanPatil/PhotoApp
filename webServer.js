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
const app = express();

// Load the Mongoose schema for User, Photo, and SchemaInfo
const User = require("./schema/user.js");
const Photo = require("./schema/photo.js");
const SchemaInfo = require("./schema/schemaInfo.js");

mongoose.set("strictQuery", false);
mongoose.connect("mongodb://127.0.0.1/project6", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const bodyParser = require("body-parser");
const multer = require("multer");
const fs = require('fs');

// Configure express-session middleware
app.use(session({
  secret: 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  },
}));

// Parse JSON request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// We have the express static module
// (http://expressjs.com/en/starter/static-files.html) do all the work for us.
app.use(express.static(__dirname));

app.get("/", function (request, response) {
  response.send("Simple web server of files from " + __dirname);
});

/**
 * Middleware to check if user is authenticated
 * Allows /admin/login, /admin/logout, and /admin/session endpoints to bypass authentication
 */
const requireAuth = (request, response, next) => {
  // Check if user session exists
  if (!request.session || !request.session.userId) {
    return response.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
};

/**
 * Apply authentication middleware to protected API routes
 */
app.use('/photosOfUser', requireAuth);
app.use('/user/list', requireAuth);
// Restrict auth to user detail route only so POST /user (registration)
// remains accessible without authentication.
app.use('/user/:id', requireAuth);

app.use('/commentsOfPhoto', requireAuth);

/**
 * POST /admin/login - Authenticate user with login_name and password
 */
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
      userId: user._id,
      first_name: user.first_name,
      last_name: user.last_name
    });

  } catch (err) {
    console.error('Error in login:', err);
    return response.status(500).json({ error: 'Internal server error' });
  }
});



/**
 * GET /admin/logout - Logout current user
 */
app.post('/admin/logout', (request, response) => {
  if (!request.session || !request.session.userId) {
    return response.status(400).json({ error: 'No user is currently logged in' });
  }

  request.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return response.status(500).json({ error: 'Error logging out' });
    }
    return response.status(200).json({ message: 'Logout successful' });
  });
});


/**
 * GET /admin/session - Get current session information
 */
app.get('/admin/session', (request, response) => {
  if (!request.session || !request.session.userId) {
    return response.status(401).json({ message: 'No active session' });
  }

  response.status(200).json({
    userId: request.session.userId,
    login_name: request.session.login_name,
    first_name: request.session.first_name,
    last_name: request.session.last_name,
  });
});

/**
 * Use express to handle argument passing in the URL. This .get will cause
 * express to accept URLs with /test/<something> and return the something in
 * request.params.p1.
 * 
 * If implement the get as follows:
 * /test        - Returns the SchemaInfo object of the database in JSON format.
 *                This is good for testing connectivity with MongoDB.
 * /test/info   - Same as /test.
 * /test/counts - Returns an object with the counts of the different collections
 *                in JSON format.
 */
app.get("/test/:p1", function (request, response) {
  // Express parses the ":p1" from the URL and returns it in the request.params
  // objects.
  console.log("/test called with param1 = ", request.params.p1);

  const param = request.params.p1 || "info";

  if (param === "info") {
    // Fetch the SchemaInfo. There should only one of them. The query of {} will
    // match it.
    SchemaInfo.find({}, function (err, info) {
      if (err) {
        // Query returned an error. We pass it back to the browser with an
        // Internal Service Error (500) error code.
        console.error("Error in /user/info:", err);
        response.status(500).send(JSON.stringify(err));
        return;
      }
      if (info.length === 0) {
        // Query didn't return an error but didn't find the SchemaInfo object -
        // This is also an internal error return.
        response.status(500).send("Missing SchemaInfo");
        return;
      }

      // We got the object - return it in JSON format.
      console.log("SchemaInfo", info[0]);
      response.end(JSON.stringify(info[0]));
    });
  } else if (param === "counts") {
    // In order to return the counts of all the collections we need to do an
    // async call to each collections. That is tricky to do so we use the async
    // package do the work. We put the collections into array and use async.each
    // to do each .count() query.
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
    // If we know understand the parameter we return a (Bad Parameter) (400)
    // status.
    response.status(400).send("Bad param " + param);
  }
});

/**
 * URL /user/list - Returns all the User objects.
 */
app.get("/user/list", async function (request, response) {
  try {
    //Fetches User list from database
    const users = await User.find({}, '_id first_name last_name').lean();
    console.log("Fetched users:", users);
    // Send the resulting array as JSON
    response.status(200).json(users);
  } catch (err) {
    console.error('Error fetching user list:', err);
    response.status(500).send({ message: 'Internal server error fetching user list.' });
  }
});

/**
 * URL /user/:id - Returns the information for User (id).
 */
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

/**
 * URL /photosOfUser/:id - Returns the Photos for User (id)
 * Each photo includes comments with user details
 */
app.get("/photosOfUser/:id", async function (request, response) {
  const userId = request.params.id;
  
  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.log("Invalid user id format:", userId);
    response.status(400).send("Invalid user ID format");
    return;
  }
  
  try {
    // First check if user exists
    const user = await User.findById(userId);
    if (!user) {
      console.log("User with _id:", userId, " not found.");
      response.status(400).json({
        error: "User not found"
      });
      return;
    }

    // Find all photos for the user
    const photos = await Photo.find({ user_id: userId });

    // Process photos to include user details and populate comments
    const processedPhotos = await Promise.all(photos.map(async (photo) => {
      // Get the photo owner's details
      const photoUser = await User.findById(photo.user_id, 'first_name last_name');
      
      // Process comments to include user details
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

      // Return processed photo object
      return {
        _id: photo._id,
        user_id: photo.user_id,
        file_name: photo.file_name,
        date_time: photo.date_time,
        comments: processedComments,
        user: {
          _id: photoUser._id,
          first_name: photoUser.first_name,
          last_name: photoUser.last_name
        }
      };
    }));

    response.status(200).json(processedPhotos);
  } catch (err) {
    console.error("Error processing photos:", err);
    response.status(500).send("Internal server error");
  }
});

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

    return response.status(200).send({ success: true });

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

// Ensure images directory exists
const imagesDir = __dirname + '/images';
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Configure multer storage to save files in the images directory with a unique name
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

/**
 * POST /photos/new - Upload a photo file and create a Photo document
 * Expects form field 'uploadedphoto' containing the file.
 */
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



app.post('/commentsOfPhoto/:photo_id', async (request, response) => {
  const photoId = request.params.photo_id;
  const text = (request.body.comment || '').trim();

  // 1. Reject empty comments
  if (!text) {
    return response.status(400).send('Empty comment not allowed');
  }

  // 2. Validate photo id
  if (!mongoose.Types.ObjectId.isValid(photoId)) {
    return response.status(400).send('Invalid photo id');
  }

  try {
    // 3. Find the photo
    const photo = await Photo.findById(photoId);
    if (!photo) {
      return response.status(400).send('Photo not found');
    }

    // 4. Build the new comment (user comes from the session)
    const newComment = {
      comment: text,
      date_time: new Date(),
      user_id: request.session.userId   // <-- THIS ties it to the logged-in user
    };

    // 5. Add and save
    photo.comments.push(newComment);
    await photo.save();

    // Simplest: just return success or the new comment
    return response.status(200).json({ success: true });
    // or: response.status(200).json(newComment);
  } catch (err) {
    console.error('Error adding comment:', err);
    return response.status(500).send('Internal server error');
  }
});
