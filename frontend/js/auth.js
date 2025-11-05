// js/auth.js
document.addEventListener("DOMContentLoaded", () => {
  // -------------------------------
  // ELEMENT REFERENCES
  // -------------------------------
  const container = document.getElementById("container");
  const registerBtn = document.getElementById("register");
  const loginBtn = document.getElementById("login");
  const registerForm = document.getElementById("registerForm");
  const loginForm = document.getElementById("loginForm");

  // -------------------------------
  // TOGGLE ANIMATION
  // -------------------------------
  registerBtn.addEventListener("click", () => container.classList.add("active"));
  loginBtn.addEventListener("click", () => container.classList.remove("active"));

  // -------------------------------
  // AUTO-REDIRECT IF ALREADY LOGGED IN
  // -------------------------------
  const existingUser = localStorage.getItem("user");
  if (existingUser) {
    window.location.href = "user-dashboard.html";
  }

  // -------------------------------
  // REGISTER FLOW
  // -------------------------------
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
        container.classList.remove("active"); 
        registerForm.reset();
      } else {
        alert(data.message || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Try again later.");
    }
  });

  // -------------------------------
  // LOGIN FLOW
  // -------------------------------
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

  // -------------------------------
  // REDIRECT BASED ON ROLE
  // -------------------------------
  function redirectUser(role) {
    if (role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "user-dashboard.html";
    }
  }
});