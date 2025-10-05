// This ensures the year runs only after the page content loads.
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById('year').textContent = new Date().getFullYear();
});
// This ensures the year runs only after the page content loads.
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById('year').textContent = new Date().getFullYear();
});

// ✅ Grab all navigation links that should require login
document.querySelectorAll('.protected').forEach(link => {

   // Add a "click" event for each protected link 
   link.addEventListener('click', function(event) {

       // If the user is NOT logged in
      if (!isLoggedIn) {
        event.preventDefault();

        // Show a popup using SweetAlert
        Swal.fire({  
                  // The type of icon to display in the popup — "info" gives a blue circle with an "i"
                  icon: 'info',

                  // The title text that appears in bold at the top of the popup
                  title: 'Login Required',

                  // The message text shown below the title to explain why the popup appeared
                  text: 'Please login or register to explore BookAmour 💖',

                  // The text shown on the confirm button at the bottom of the popup
                  confirmButtonText: 'Go to Login', 

                  // Custom CSS classes for styling different parts of the popup
                  customClass: {
                      // Applies to the main popup container (background, shape, shadow, etc.)
                      popup: 'bookamour-popup rounded-shadow',

                      // Applies to the popup title text
                      title: 'bookamour-title',

                      // Applies to the popup body/content text
                      content: 'bookamour-content',

                      // Applies to the confirm button (color, padding, shape, etc.)
                      confirmButton: 'bookamour-button'
                  } }).then(() => {
            // After user clicks "Go to Login" → redirect to register page
            window.location.href = "/login";
        });
      }

      // If user IS logged in → link works as usual (no need to block)
   });
});

//registration page's seewt alert if user already exists
// This event runs only after the whole HTML page content has loaded
document.addEventListener("DOMContentLoaded", function () {

  // Select the registration form by its ID
  const registerForm = document.getElementById("registerForm");

  // Listen for the "submit" event on the registration form
  registerForm.addEventListener("submit", async function (e) {
    
    e.preventDefault(); // ❗ Stop the form from reloading the page

    // Get the values entered by the user in the form fields
    let fname = document.getElementById("fname").value;
    let lname = document.getElementById("lname").value;
    let email = document.getElementById("email").value;
    let password = document.getElementById("password").value;

    // Send the form data to the backend using fetch API
    let res = await fetch("/register", {
      method: "POST", // Use POST because we are sending data
      headers: { "Content-Type": "application/json" }, // Tell the server we are sending JSON
      body: JSON.stringify({ fname, lname, email, password }) // Convert the form data into JSON format
    });

    // Get the response from the backend as JSON
    let data = await res.json();

    // If the backend says the user already exists
    if (data.status === "exists") {
      Swal.fire({
        icon: "info", // Show an info icon
        title: "Already Registered", // Title of the popup
        text: "You are already registered. Please log in.", // Message in the popup
        confirmButtonText: "Go to Login" // Text on the button
      }).then(() => {
        window.location.href = "/login"; // Redirect to login page after user clicks button
      });

    // If the backend says the registration was successful
    } else if (data.status === "registered") {
      Swal.fire({
        icon: "success", // Show a success icon
        title: "Registered Successfully", // Title of the popup
        text: "Your account has been created.", // Message in the popup
        confirmButtonText: "Go to Login" // Text on the button
      }).then(() => {
        window.location.href = "/login"; // Redirect to login page after user clicks button
      });
    }
  });
});

// Handling Login password/email error using SweetAlert2
// ✅ Wrap inside DOMContentLoaded to ensure DOM elements exist before attaching listeners
document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm"); // get login form element

  // ✅ Only attach listener if loginForm exists on this page
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {

      e.preventDefault(); // prevent normal form submission (page refresh)

      // Get values from login form fields and trim extra spaces
      let loginEmail = document.getElementById("email").value.trim();
      let loginPass = document.getElementById("password").value.trim();

      // ✅ Basic validation before sending request
      if (!loginEmail || !loginPass) {
        Swal.fire({
          icon: "warning",
          title: "Missing Fields",
          text: "Please enter both email and password."
        });
        return; // stop execution if validation fails
      }

      try {
        // Send login request to backend
        let res = await fetch("/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: loginEmail, password: loginPass })
        });

        // Parse response as JSON
        let data = await res.json();

        // ✅ Validate response format
        if (!data.status) {
          Swal.fire({
            icon: "error",
            title: "Invalid Response",
            text: "Server did not send a valid response."
          });
          return;
        }

        // Handle login success
        if (data.status === "success") {
          Swal.fire({
            icon: "success",
            title: "Logged in!",
            text: "Welcome to BookAmour 💖"
          }).then(() => {
            window.location.href = "/home"; // redirect after OK
          });

        // Handle incorrect password
        } else if (data.status === "wrong_password") {
          Swal.fire({
            icon: "error",
            title: "Login Failed",
            text: "Incorrect password. Please try again."
          });

        // Handle non-existent user
        } else if (data.status === "user_not_found") {
          Swal.fire({
            icon: "error",
            title: "User Not Found",
            text: "No account found with this email. Please register first."
          });

        // Catch-all for unexpected statuses
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Something went wrong. Please try again later."
          });
        }

      } catch (error) {
        // Handle fetch/network errors
        console.error("Login request failed:", error);
        Swal.fire({
          icon: "error",
          title: "Network Error",
          text: "Unable to connect to server. Please check your internet connection."
        });
      }
    });
  }
});

//Image container in requeste page
document.addEventListener("DOMContentLoaded", () => {
  const uploadCheck = document.getElementById("uploadCheck");
  const imageUploadBox = document.getElementById("imageUploadBox");

  if (uploadCheck && imageUploadBox) {
    uploadCheck.addEventListener("change", () => {
      // Use flex so CSS styling works
      imageUploadBox.style.display = uploadCheck.checked ? "flex" : "none";
    });
  }

  const fileInput = document.getElementById("book_image");
const previewImage = document.getElementById("previewImage");
const uploadLabel = document.getElementById("uploadLabel");

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        previewImage.src = e.target.result;
        previewImage.style.display = "block";   // show image
        uploadLabel.style.display = "none";     // hide text
      };
      reader.readAsDataURL(file);
    } else {
      previewImage.style.display = "none";
      uploadLabel.style.display = "flex"; // reset label
    }
  });
}
});

document.addEventListener("DOMContentLoaded", () => {
    // ✅ Grab the login status flag set from server-side
    const isLoggedIn = window.isLoggedIn;

    // ==============================
    // HANDLE LIKE / DISLIKE BUTTONS
    // ==============================
    document.querySelectorAll(".btn-like, .btn-dislike").forEach(button => {
        button.addEventListener("click", async (e) => {
            e.preventDefault(); // Prevent default form submission

            // 🔒 If user is not logged in → show SweetAlert
            if (!isLoggedIn) {
                Swal.fire({
                    icon: "info",
                    title: "Login Required",
                    text: "Please login or register to vote 👍👎",
                    confirmButtonText: "Go to Login"
                }).then(() => {
                    window.location.href = "/login"; // Redirect after click
                });
                return;
            }

            // 📌 Find the form containing this button
            const form = button.closest("form");
            if (!form) {
                console.error("No form found for this button.");
                return;
            }

            // 📌 Get the form's action URL (backend endpoint)
            const action = form.getAttribute("action");
            if (!action) {
                console.error("No action URL found for form.");
                return;
            }

            try {
                // 🔄 Send POST request to backend
                const res = await fetch(action, {
                    method: "POST",
                    credentials: "same-origin", // Ensure cookies are sent
                    headers: { "Accept": "application/json" }
                });

                // 📌 If unauthorized (401) → show login popup
                if (res.status === 401) {
                    Swal.fire({
                        icon: "info",
                        title: "Login Required",
                        text: "Please login to vote.",
                        confirmButtonText: "Go to Login"
                    }).then(() => {
                        window.location.href = "/login";
                    });
                    return;
                }

                // 📌 Parse response JSON
                const data = await res.json();

                // 👍 If vote is successful → update UI
                if (data.success) {
                    const card = button.closest(".request-card") || document;
                    const likeBtn = card.querySelector(".btn-like");
                    const dislikeBtn = card.querySelector(".btn-dislike");

                    if (likeBtn && typeof data.likes === "number") {
                        likeBtn.innerText = `👍 Like (${data.likes})`;
                    }
                    if (dislikeBtn && typeof data.dislikes === "number") {
                        dislikeBtn.innerText = `👎 Dislike (${data.dislikes})`;
                    }

                    Swal.fire({
                        icon: "success",
                        title: "Vote Recorded",
                        timer: 1000,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: data.error || "Vote could not be recorded."
                    });
                }
            } catch (err) {
                console.error("Vote request failed:", err);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "Something went wrong."
                });
            }
        });
    });

    // ==============================
    // HANDLE SUGGEST BUTTONS
    // ==============================
    document.querySelectorAll(".btn-suggest").forEach(button => {
        button.addEventListener("click", (e) => {
            // 🔒 If user is not logged in → prevent action and show popup
            if (!isLoggedIn) {
                e.preventDefault();
                Swal.fire({
                    icon: "info",
                    title: "Login Required",
                    text: "Please login or register to suggest a book 💖",
                    confirmButtonText: "Go to Login"
                }).then(() => {
                    window.location.href = "/login";
                });
            }
        });
    });
});
