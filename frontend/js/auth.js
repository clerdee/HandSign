// js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  // --- ELEMENT REFERENCES ---
  const splashScreen = document.getElementById("splashScreen");
  const mainContainer = document.getElementById("container");
  const splashDescription = document.getElementById("splashDescription");
  const existingUser = localStorage.getItem("user");

  // --- TYPEWRITER FUNCTION ---
  /**
   * @param {HTMLElement} element 
   * @param {string} text 
   * @param {number} speed 
   * @param {function} onFinished 
   */
  function typeWriter(element, text, speed, onFinished) {
    let i = 0;
    if (!element) {
      if (onFinished) onFinished();
      return;
    }
    
    element.innerHTML = ""; 

    function type() {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        if (element.classList) {
            element.classList.add('typing-done');
        }
        if (onFinished) onFinished();
      }
    }
    type(); 
  }

  // --- HELPER FUNCTION: REDIRECT (Unchanged) ---
  function redirectUser(role) {
    if (role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "user-dashboard.html";
    }
  }

  // --- MAIN LOGIC ---
  const textToType = splashDescription
    ? splashDescription.innerText
    : "Welcome to HandSign."; 
  const typingSpeed = 70; 
  const pauseAfterTyping = 1000; 

  if (existingUser) {
    // --- SCENARIO 1: USER IS LOGGED IN ---

    const onTypingDone = () => {
      setTimeout(() => {
        try {
          const user = JSON.parse(existingUser);
          redirectUser(user.role);
        } catch (e) {
          console.error("Failed to parse user from localStorage", e);
          localStorage.removeItem("user");
          location.reload();
        }
      }, pauseAfterTyping);
    };

    typeWriter(splashDescription, textToType, typingSpeed, onTypingDone);

  } else {
    // --- SCENARIO 2: USER IS NOT LOGGED IN ---

    const onTypingDone = () => {
      setTimeout(() => {
        if (splashScreen) splashScreen.classList.add("fade-out");
        if (mainContainer) mainContainer.classList.add("show");
      }, pauseAfterTyping);
    };

    typeWriter(splashDescription, textToType, typingSpeed, onTypingDone);

    const registerBtn = document.getElementById("register");
    const loginBtn = document.getElementById("login");
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");

    if (registerBtn && loginBtn && mainContainer) {
      registerBtn.addEventListener("click", () =>
        mainContainer.classList.add("active")
      );
      loginBtn.addEventListener("click", () =>
        mainContainer.classList.remove("active")
      );
    }

    if (registerForm) {
      registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const password = document.getElementById("reg_password").value;
        const repeat = document.getElementById("reg_repeat").value;
        if (password !== repeat) {
          alert("Passwords do not match!");
          return;
        }
        const formData = new FormData(registerForm);
        try {
          const res = await fetch("http://127.0.0.1:5000/api/register", {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (res.ok) {
            alert(data.message || "Registration successful! You can now log in.");
            mainContainer.classList.remove("active");
            registerForm.reset();
          } else {
            alert(data.message || "Registration failed.");
          }
        } catch (err) {
          console.error(err);
          alert("Server error. Try again later.");
        }
      });
    }

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const credentials = {
          email: document.getElementById("login_email").value.trim(),
          password: document.getElementById("login_password").value,
        };
        if (!credentials.email || !credentials.password) {
          alert("Please fill in both fields.");
          return;
        }
        try {
          const res = await fetch("http://127.0.0.1:5000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(credentials),
          });
          const data = await res.json();
          if (res.ok && data.user) {
            localStorage.setItem("user", JSON.stringify(data.user));
            redirectUser(data.user.role);
          } else {
            alert(data.message || "❌ Invalid email or password.");
          }
        } catch (err) {
          console.error("Login error:", err);
          alert("⚠️ Server error. Please try again later.");
        }
      });
    }
  }
});