// ========== HANDSIGN ADMIN DASHBOARD SCRIPT ==========
document.addEventListener("DOMContentLoaded", () => {
  const sidebarLinks = document.querySelectorAll(".nav-link");
  const sectionTitle = document.getElementById("sectionTitle");
  const contentArea = document.getElementById("contentArea");
  const logoutBtn = document.getElementById("logoutBtn");

  // ======== SIDEBAR NAVIGATION ========
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      if (link.id === "logoutBtn") return;

      sidebarLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      const section = link.dataset.section;
      sectionTitle.textContent =
        section.charAt(0).toUpperCase() + section.slice(1);

      loadSection(section);
    });
  });

  // ======== LOGOUT BUTTON ========
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (confirm("Are you sure you want to log out?")) {
        window.location.href = "login.html";
      }
    });
  }

  // ======== DYNAMIC SECTION LOADING ========
  async function loadSection(section) {
    const contentArea = document.getElementById("contentArea");
    contentArea.innerHTML = "";

    try {
      const response = await fetch(`sections/${section}.html`);
      const html = await response.text();
      contentArea.innerHTML = html;

      // ======== SECTION-SPECIFIC SCRIPTS ========
      loadSectionScript(section);

      // ======== SECTION-SPECIFIC INITIALIZATIONS ========
      if (section === "dashboard") {
        // initialize dashboard chart
        initDashboardChart();
      }
    } catch (error) {
      contentArea.innerHTML = "<p>Error loading section.</p>";
      console.error("Error loading section:", error);
    }
  }

  // ======== LOAD JS SCRIPT BASED ON SECTION ========
  function loadSectionScript(section) {
    // Remove previous section scripts (avoid duplicates)
    const existing = document.querySelector(`script[data-section-script]`);
    if (existing) existing.remove();

    const script = document.createElement("script");
    script.src = `script/${section}.js`;
    script.dataset.sectionScript = section;
    document.body.appendChild(script);
  }

  // ======== DASHBOARD CHART FUNCTION ========
  function initDashboardChart() {
    const ctx = document.getElementById("dashboardChart");
    if (!ctx) return;

    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
          {
            label: "Translations per Day",
            data: [20, 45, 30, 50, 60, 40, 70],
            backgroundColor: "rgba(108, 99, 255, 0.6)",
            borderColor: "#6c63ff",
            borderWidth: 2,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, position: "top" } },
        scales: {
          y: { beginAtZero: true, grid: { color: "#e0e0e0" } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // ======== AUTO-LOAD DEFAULT SECTION ========
  loadSection("dashboard");
});
