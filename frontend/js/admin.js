document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const sectionTitle = document.getElementById("sectionTitle");
  const contentArea = document.getElementById("contentArea");
  const navLinks = document.querySelectorAll(".nav-link");

  // ==============================
  // CHECK ADMIN LOGIN STATUS
  // ==============================
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== "admin") {
    alert("Access denied! Admins only.");
    window.location.href = "handsign.html"; 
    return;
  }

  // ==============================
  // LOGOUT FUNCTION
  // ==============================
  logoutBtn.addEventListener("click", () => {
    if (confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("user");
      window.location.href = "handsign.html";
    }
  });

  // ==============================
  // LOAD SECTION HTML FILE
  // ==============================
  async function loadSection(filePath, scriptPath = null) {
    try {
      const res = await fetch(filePath);
      if (!res.ok) throw new Error("Failed to load section");
      const html = await res.text();
      contentArea.innerHTML = html;

      if (scriptPath) {
        const script = document.createElement("script");
        script.src = scriptPath;
        document.body.appendChild(script);
      }
    } catch (err) {
      console.error("Error loading section:", err);
      contentArea.innerHTML = `<p class="error">⚠️ Unable to load section. Please try again.</p>`;
    }
  }
  // ==============================
  // SIDEBAR NAVIGATION HANDLER
  // ==============================
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const section = link.getAttribute("data-section");

      switch (section) {
        case "dashboard":
          sectionTitle.textContent = "Dashboard";
          loadSection("sections/dashboard.html");
          break;
        case "users":
          sectionTitle.textContent = "Users";
          loadSection("sections/users.html");
          break;
        case "translation":
          sectionTitle.textContent = "Translations";
          loadSection("sections/translation.html");
          break;
        case "handgestures":
          sectionTitle.textContent = "Hand Gestures";
          loadSection("sections/addgh.html", "js/addgh.js");
          break;
        default:
          sectionTitle.textContent = "Not Found";
          contentArea.innerHTML = `<p>Section not found.</p>`;
      }
    });
  });

  // ==============================
  // DISPLAY ADMIN INFO ON DASHBOARD
  // ==============================
  function showAdminHeader() {
    const headerDiv = document.createElement("div");
    headerDiv.classList.add("admin-info");
    headerDiv.innerHTML = `
      <div class="welcome-message">
        <h2>Welcome, ${user.name} 👋</h2>
        <p>${user.email}</p>
      </div>
    `;
    contentArea.prepend(headerDiv);
  }

  // ==============================
  // INITIAL LOAD (Dashboard)
  // ==============================
  loadSection("sections/dashboard.html").then(() => showAdminHeader());
});
