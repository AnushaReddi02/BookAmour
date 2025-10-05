const express = require('express');

// ===========================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ===========================

// Step 1: Import multer and path modules
// multer → handles multipart/form-data (file uploads)
// path → helps handle file paths and extensions
const multer = require("multer");
const path = require('path');
const mysql = require('mysql2');
const { faker } = require('@faker-js/faker');

// This imports the 'json' function from Node.js streams so we can easily read JSON data from a stream.
// Streams let us handle data piece-by-piece instead of all at once, which is useful for large files or network requests.
const { json } = require('stream/consumers');

const session = require('express-session');   // Import session middleware


const app = express();

// (MULLER)Step 2: Define where and how uploaded files should be stored
const storage = multer.diskStorage({

    // destination → defines folder where uploaded files will be saved
    destination: function (req, file, cb) {
        // "public/uploads/" → folder inside project where images will be stored
        // ✅ You must manually create this folder before uploading
        cb(null, "public/uploads/");
    },

    // filename → defines how uploaded files will be named
    filename: function (req, file, cb) {
        // uniqueSuffix → ensures filename is unique so no file gets overwritten
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);

        // path.extname(file.originalname) → gets the file extension (e.g., .jpg, .png)
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Step 3: Create multer upload object using the storage configuration
// This object will be used in routes to handle file uploads
const upload = multer({ storage: storage });

// ===========================
// SESSION SETUP
// ===========================
// We need this to keep track of user sessions (login status, data, etc.)
// Session middleware stores data on the server for each user and links it with a cookie in the browser.
app.use(session({
    secret: "BookAmourSecretKey02",  // 🔒 A secret key used to sign and secure the session ID cookie. Change this to something unique and hard to guess.
    resave: false,   // ❌ Don't save the session back to the store if it hasn't been modified. Saves resources.
    saveUninitialized: false, // ⚡ Don't create a session until something is stored in it. Keeps things clean.
    cookie: { maxAge: 1000 * 60 * 60 } // Session lasts 1 hour
}));

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, '/public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const port = process.env.PORT || 8080;

function getId() {
    return faker.string.uuid();
}

// Create connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4'
});


// Force utf8mb4 after connection
connection.query("SET NAMES utf8mb4;");
connection.query("SET CHARACTER SET utf8mb4;");
connection.query("SET character_set_connection = utf8mb4;");

// Home page
app.get("/", (req, res) => {
    if (!req.session.userEmail) return res.redirect("/login");
    let title = "Home";
    let isLoggedIn = !!req.session.userEmail;
    let books = require("./books.json");
    res.render("home", {
        title,
        isLoggedIn,
        books,
        username: req.session.userName
    });
});

// Redirect /home to /
app.get("/home", (req, res) => {
    res.redirect("/");
});


// GET → show registration page
app.get("/register", (req, res) => {
    let title = "Register";
    let isLoggedIn = !!req.session.userEmail;
    res.render("register", { title, isLoggedIn });
});



// POST → handle submitted registration form
app.post("/register", (req, res) => {
    const id = getId(); // generate a UUID
    let { fname, lname, email, password } = req.body;
    let data = [[id, fname, lname, email, password]]; // Nested array for VALUES

    let q1 = `SELECT * FROM usersRegistered WHERE email = ?`;
    let q2 = `INSERT INTO usersRegistered(id, first_name, last_name, email, password) VALUES ?`;

    connection.query(q1, [email], (error, result) => {
        if (error) {
            console.error("Error checking email:", error);
            return res.status(500).json({ status: "error", message: "Server error" });
        }

        if (result.length > 0) {
            console.log("User already registered:", email);
            return res.json({ status: "exists" }); // send flag to frontend
        }

        // Email not found → insert new user
        connection.query(q2, [data], (error, result) => {
            if (error) {
                console.error("Error inserting user:", error);
                return res.status(500).json({ status: "error", message: "Server error" });
            }

            console.log("User registered successfully:", email);

            // ===========================
            // STORE SESSION DATA
            // ===========================
            req.session.userEmail = email; // save email for session
            req.session.userName = fname + " " + lname; // save name for session
            req.session.userId = id; // save user ID
            req.session.isLoggedIn = true; // mark logged in

            return res.json({ status: "registered" }); // send flag to frontend
        });
    });
});


//GET → show login-page
// Handle GET request to /login route → shows login page
app.get("/login", (req, res) => {
    let title = "Log-in"; // Page title
    let isLoggedIn = !!req.session.userEmail; // Check if user is already logged in

    // If user is already logged in → redirect to home page
    if (isLoggedIn) {
        console.log("User already logged in:", req.session.userEmail);
        return res.redirect("/"); 
    }

    // Render login page
    res.render("login", { title, isLoggedIn });
});

// Handle POST request to /login route when login form is submitted
app.post("/login", (req, res) => {

    // Destructure email and password from the request body and rename them
    let { email: loginEmail, password: loginPass } = req.body;

    // SQL query to select email and password from the usersRegistered table where email matches
    let q1 = `SELECT * FROM usersRegistered WHERE email = ?`;

    try {
        // Execute the query with the email value to replace the "?" placeholder
        connection.query(q1, [loginEmail], (error, result) => {
            if (error) {
                console.error("Error during login query:", error);
                return res.status(500).json({ status: "error", message: "Server error" });
            }

            // Check if the query returned any rows (i.e., if the user exists)
            if (result.length === 0) {
                console.log("Login failed: Email not found →", loginEmail);
                return res.json({ status: "user_not_found" }); // send flag to frontend
            }

            let user = result[0]; // Get the first matching user

            // Compare provided password and email with database values
            if (loginPass === user.password && loginEmail === user.email) {

                // ===========================
                // STORE SESSION DATA ON LOGIN
                // ===========================
                req.session.userEmail = loginEmail; // Store user email in session
                req.session.userName = user.first_name + " " + user.last_name; // Store full name in session
                req.session.userId = user.id; // Store user ID
                req.session.isLoggedIn = true; // Mark user as logged in

                console.log("Login successful for:", loginEmail);

                return res.json({ status: "success" }); // send flag to frontend
            } else {
                // Password mismatch case
                console.log("Login failed: Wrong password for", loginEmail);
                return res.json({ status: "wrong_password" }); // send flag to frontend
            }
        });
    } catch (error) {
        // If any error occurs during execution → log it and send generic error status
        console.error("Unexpected error during login:", error);
        return res.status(500).json({ status: "error", message: "Server error" });
    }
});



app.get("/genres", (req, res) => {
    let title = 'Genre';
    let genres = require('./genre.json');
    let isLoggedIn = !!req.session.userEmail;
    res.render("genre", {
        title,
        isLoggedIn,
        username: req.session.userName,
        genres
    });
});

app.get("/request", (req, res) => {
    let title = "Make a Request";
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    res.render("request", {
        title,
        isLoggedIn,
        username,
        genre: "" // optional, you can load genres if needed
    });
});


app.get("/myRequests", (req, res) => {
    let title = "My Requests";
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    const myRequestsQuery = `SELECT * FROM posts WHERE type = "request" AND email = ? ORDER BY created_at DESC`;

    connection.query(myRequestsQuery, [req.session.userEmail], (err, requests) => {
        if (err) return res.status(500).send(err);

        const requestIds = requests.map(r => r.id);
        if (requestIds.length === 0) {
            return res.render("userRequests", { requests: [], title, isLoggedIn, username });
        }

        const suggestionQuery = `SELECT * FROM posts WHERE type = "suggest" AND parent_id IN (?);`;
        connection.query(suggestionQuery, [requestIds], (err, suggestions) => {
            if (err) return res.status(500).send(err);

            requests.forEach(r => {
                r.suggestions = suggestions.filter(s => s.parent_id === r.id);
            });

            res.render("userRequests", { requests, title, isLoggedIn, username });
        });
    });
});


app.post("/request", (req, res) => {
    let title = "Requests";
    let isLoggedIn = true;

    // ===========================
    // USE SESSION DATA INSTEAD OF QUERYING DATABASE AGAIN
    // ===========================
    let username = req.session.userName || "Guest"; // fallback if not logged in

    // ===========================
    // RECEIVE GENRE FROM THE FORM
    // ===========================
    let genre = req.body.genre || "Unknown";

    res.render('request.ejs', { title, isLoggedIn, username,genre});

});

// ===========================
// HANDLE USER REQUEST SUBMISSION
// ===========================
app.post("/userRequests", upload.single("book_image"), (req, res) => {

    // ===========================
    // EXTRACT FORM DATA
    // ===========================
    let { request, genre } = req.body; // Get description and genre from form

    // ===========================
    // USE SESSION DATA INSTEAD OF QUERYING DATABASE AGAIN
    // ===========================
    let username = req.session.userName; // Get logged-in username from session
    let email = req.session.userEmail;   // Get logged-in email from session

    // ===========================
    // HANDLE IMAGE UPLOAD
    // ===========================
    // If file uploaded → get filename, otherwise null
    let book_image = req.file ? req.file.filename : null;

    // ===========================
    // INSERT REQUEST DATA INTO DATABASE
    // ===========================
    let sql = `
        INSERT INTO posts (username, email, book_image, genre, type, description) 
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    connection.query(
        sql,
        [username, email, book_image, genre, "request", request],
        (err, result) => {
            if (err) throw err;

            // ===========================
            // REDIRECT USER TO REQUEST LIST PAGE
            // ===========================
            res.redirect("/userRequests");
        }
    );
});

// ===========================
// GET → Show all requests
// ===========================
app.get("/userRequests", (req, res) => {
    const query = `SELECT * FROM posts WHERE type = "request" ORDER BY created_at DESC;`;
    let title = 'Requests';
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    connection.query(query, (err, requests) => {
        if (err) return res.status(500).send(err);

        const requestIds = requests.map(r => r.id);
        if (requestIds.length === 0) {
            return res.render("userRequests", { requests: [], title, isLoggedIn, username });
        }

        const suggestionQuery = `SELECT * FROM posts WHERE type = "suggestion" AND parent_id IN (?);`;
        connection.query(suggestionQuery, [requestIds], (err, suggestions) => {
            if (err) return res.status(500).send(err);

            requests.forEach(r => {
                r.suggestions = suggestions.filter(s => s.parent_id === r.id);
            });

            res.render("userRequests", { requests, title, isLoggedIn, username });
        });
    });
});



// ===========================
// Routes for Like, Dislike, Suggest
// ===========================
// Vote route for likes/dislikes
app.post("/vote/:postId/:type", (req, res) => {
    const { postId, type } = req.params; // type should be 'like' or 'dislike'
    const userId = req.session.userId;   // logged-in user’s ID

    if (!userId) {
        return res.status(401).send("You must be logged in to vote.");
    }

    const sql = `
        INSERT INTO votes (post_id, user_id, vote_type)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)
    `;

    connection.query(sql, [postId, userId, type], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Error recording vote");
        }
        res.json({ success: true });
    });
});


//suggest form
// GET → Show suggestion form & all suggestions for a request
app.get("/suggest/:id", (req, res) => {
    let requestId = req.params.id;
    let title = "Suggestions";
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    const requestQuery = `SELECT * FROM posts WHERE id = ?`;
    connection.query(requestQuery, [requestId], (err, requestResult) => {
        if (err) return res.status(500).send(err);
        if (requestResult.length === 0) return res.send("Request not found");

        const suggestionsQuery = `SELECT * FROM posts WHERE type = "suggest" AND parent_id = ? ORDER BY created_at DESC`;
        connection.query(suggestionsQuery, [requestId], (err, suggestions) => {
            if (err) return res.status(500).send(err);

            res.render("suggest", {  // 🔹 render suggest.ejs instead
                title,
                isLoggedIn,
                username,
                requestId,
                requestHolder: requestResult[0].username, // the person who posted the request
                requestText: requestResult[0].description,
                suggestions
            });
        });
    });
});


app.get("/suggest", (req, res) => {
    let title = "Make a Suggestion";
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    res.render("suggest", { title, isLoggedIn, username, requestId: null, requestHolder: "", requestText: "" });
});



// ===========================
// SUBMIT SUGGESTION WITH IMAGE UPLOAD
// ===========================
app.post("/submitSuggestion/:id", upload.single("book_image"), (req, res) => {
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    const { suggestion, genre } = req.body;
    const requestId = req.params.id;

    if (!suggestion || suggestion.trim() === "" || !genre || genre.trim() === "") {
        return res.status(400).send("Suggestion and genre cannot be empty");
    }

    const sql = `
        INSERT INTO posts (username, email, type, description, parent_id, book_image, genre) 
        VALUES (?, ?, 'suggest', ?, ?, ?, ?)
    `;

    connection.query(
        sql,
        [
            req.session.userName,
            req.session.userEmail,
            suggestion,
            requestId,
            req.file ? req.file.filename : null,
            genre
        ],
        (err) => {
            if (err) {
                console.error("Error inserting suggestion:", err);
                return res.status(500).json({ error: err.message });
            }

            connection.query(
                `UPDATE posts SET suggestions_count = suggestions_count + 1 WHERE id = ?`,
                [requestId],
                (err) => {
                    if (err) {
                        console.error("Error updating suggestion count:", err);
                        return res.status(500).json({ error: err.message });
                    }

                    res.redirect(`/userSuggestions/${requestId}`);
                }
            );
        }
    );
});


// ===========================
// SUGGESTIONS PAGE
// ===========================
// GET → Show all suggestions
app.get("/userSuggestions", (req, res) => {
    let title = "All Suggestions";
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    const suggestionsQuery = `SELECT * FROM posts WHERE type = "suggest" ORDER BY created_at DESC`;

    connection.query(suggestionsQuery, (err, suggestions) => {
        if (err) return res.status(500).send(err);

        res.render("userSuggestions", {
            title,
            isLoggedIn,
            username,
            suggestions
        });
    });
});


// ===========================
// SUGGESTIONS PAGE of single user
// ===========================
// GET → Show all suggestions

app.get("/mySuggestions", (req, res) => {
    let title = "My Suggestions";
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    const mySuggestionsQuery = `SELECT * FROM posts WHERE type = "suggest" AND email = ? ORDER BY created_at DESC`;

    connection.query(mySuggestionsQuery, [req.session.userEmail], (err, suggestions) => {
        if (err) return res.status(500).send(err);

        res.render("userSuggestions", {
            title,
            isLoggedIn,
            username,
            suggestions
        });
    });
});

app.get("/about", (req, res) => {
    let title = "About Us";
    let isLoggedIn = !!req.session.userEmail;
    let username = req.session.userName || "";

    res.render("about", { title, isLoggedIn, username });
});


// ===========================
// LOGOUT ROUTE
// ===========================
// To destroy session and log user out
// app.get("/logout", (req, res) => {
//     req.session.destroy(err => {
//         if (err) {
//             console.log(err);
//             return res.send("Error logging out");
//         }
//         res.redirect("/login"); // redirect to login after logout
//     });
// });

app.listen(port, () => {
    console.log(`Server is listening at the port ${port}`);
});
