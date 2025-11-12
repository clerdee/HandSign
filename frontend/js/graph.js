// ==========================
// DASHBOARD GRAPHS (Chart.js)
// ==========================
$(document).ready(function () {
  function waitForElement(selector, callback) {
    const el = document.querySelector(selector);
    if (el) callback(el);
    else {
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          obs.disconnect();
          callback(el);
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }
  }

  // --------------------------
  // 1️⃣ TRANSLATIONS PER DAY
  // --------------------------
  function loadTranslationsChart() {
    $.ajax({
      url: "/api/translations_per_day",
      method: "GET",
      success: function (data) {
        waitForElement("#translationsChart", (canvas) => {
          const ctx = canvas.getContext("2d");
          if (window.translationsChartInstance) window.translationsChartInstance.destroy();
          window.translationsChartInstance = new Chart(ctx, {
            type: "line",
            data: {
              labels: data.map((d) => d.date),
              datasets: [
                {
                  label: "Translations per Day",
                  data: data.map((d) => d.count),
                  borderColor: "#4CAF50",
                  backgroundColor: "rgba(76,175,80,0.2)",
                  fill: true,
                  tension: 0.3,
                },
              ],
            },
            options: {
              responsive: true,
              scales: { y: { beginAtZero: true } },
              plugins: {
                legend: { display: false },
                title: { display: true, text: "Translations per Day", font: { size: 16 } },
              },
            },
          });
        });
      },
      error: function () {
        console.error("Error loading translations per day data.");
      },
    });
  }

  // --------------------------
  // 2️⃣ USERS ROLE DISTRIBUTION
  // --------------------------
  function loadUsersChart() {
    $.ajax({
      url: "/api/users_count_roles",
      method: "GET",
      success: function (data) {
        waitForElement("#usersChart", (canvas) => {
          const ctx = canvas.getContext("2d");
          if (window.usersChartInstance) window.usersChartInstance.destroy();
          window.usersChartInstance = new Chart(ctx, {
            type: "pie",
            data: {
              labels: ["Users", "Admins"],
              datasets: [
                {
                  data: [data.user_count, data.admin_count],
                  backgroundColor: ["#36A2EB", "#FF6384"],
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: "bottom" },
                title: { display: true, text: "User Role Distribution", font: { size: 16 } },
              },
            },
          });
        });
      },
      error: function () {
        console.error("Error loading user roles data.");
      },
    });
  }

  // --------------------------
  // 3️⃣ TRANSLATIONS PER USER
  // --------------------------
  function loadUserUsageChart() {
    $.ajax({
      url: "/api/translations_per_user",
      method: "GET",
      success: function (data) {
        waitForElement("#userUsageChart", (canvas) => {
          const ctx = canvas.getContext("2d");
          if (window.userUsageChartInstance) window.userUsageChartInstance.destroy();
          window.userUsageChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
              labels: data.map((u) => u.user_name),
              datasets: [
                {
                  label: "Translations by User",
                  data: data.map((u) => u.count),
                  backgroundColor: "#42A5F5",
                },
              ],
            },
            options: {
              responsive: true,
              scales: { y: { beginAtZero: true } },
              plugins: {
                title: { display: true, text: "Translations per User", font: { size: 16 } },
              },
            },
          });
        });
      },
      error: function () {
        console.error("Error loading translations per user data.");
      },
    });
  }

  // --------------------------
  // 4️⃣ INPUT TYPE USAGE
  // --------------------------
  function loadInputTypeChart() {
    $.ajax({
      url: "/api/input_type_usage",
      method: "GET",
      success: function (data) {
        waitForElement("#inputTypeChart", (canvas) => {
          const ctx = canvas.getContext("2d");
          if (window.inputTypeChartInstance) window.inputTypeChartInstance.destroy();
          window.inputTypeChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: data.map((d) => d.input_type),
              datasets: [
                {
                  data: data.map((d) => d.count),
                  backgroundColor: ["#FFCE56", "#4BC0C0", "#9966FF"],
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: "bottom" },
                title: { display: true, text: "Input Type Usage", font: { size: 16 } },
              },
            },
          });
        });
      },
      error: function () {
        console.error("Error loading input type data.");
      },
    });
  }

  // --------------------------
  // 5️⃣ OUTPUT TYPE USAGE
  // --------------------------
  function loadOutputTypeChart() {
    $.ajax({
      url: "/api/output_type_usage",
      method: "GET",
      success: function (data) {
        waitForElement("#outputTypeChart", (canvas) => {
          const ctx = canvas.getContext("2d");
          if (window.outputTypeChartInstance) window.outputTypeChartInstance.destroy();
          window.outputTypeChartInstance = new Chart(ctx, {
            type: "doughnut",
            data: {
              labels: data.map((d) => d.output_type),
              datasets: [
                {
                  data: data.map((d) => d.count),
                  backgroundColor: ["#36A2EB", "#FF6384", "#FF9F40"],
                },
              ],
            },
            options: {
              responsive: true,
              plugins: {
                legend: { position: "bottom" },
                title: { display: true, text: "Output Type Usage", font: { size: 16 } },
              },
            },
          });
        });
      },
      error: function () {
        console.error("Error loading output type data.");
      },
    });
  }

  // --------------------------
  // 6️⃣ USER AGE DEMOGRAPHICS 
  // --------------------------
  function loadAgeChart() {
    $.ajax({
      url: "/api/admin/age_data",
      method: "GET",
      success: function (data) {
        waitForElement("#ageChart", (canvas) => {
          const ctx = canvas.getContext("2d");
          if (window.ageChartInstance) window.ageChartInstance.destroy();

          const labels = Object.keys(data);
          const values = Object.values(data);

          window.ageChartInstance = new Chart(ctx, {
            type: "bar",
            data: {
              labels,
              datasets: [
                {
                  label: "User Count",
                  data: values,
                  backgroundColor: "#FF6384",
                },
              ],
            },
            options: {
              responsive: true,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: {
                    stepSize: 1, 
                  },
                },
              },
              plugins: {
                title: { display: true, text: "User Age Demographics", font: { size: 16 } },
              },
            },
          });
        });
      },
      error: function () {
        console.error("Error loading age demographics data.");
      },
    });
  }

  // --------------------------
  // INITIAL LOAD
  // --------------------------
  loadTranslationsChart();
  loadUsersChart();
  loadUserUsageChart();
  loadInputTypeChart();
  loadOutputTypeChart();
  loadAgeChart(); 

  // ==============================
  // EXPORT FUNCTIONS
  // ==============================

  // ✅ CSV Export
  function exportChartsToCSV() {
    const data = [];

    const charts = [
      { name: "Translations per Day", instance: window.translationsChartInstance },
      { name: "User Role Distribution", instance: window.usersChartInstance },
      { name: "Translations per User", instance: window.userUsageChartInstance },
      { name: "Input Type Usage", instance: window.inputTypeChartInstance },
      { name: "Output Type Usage", instance: window.outputTypeChartInstance },
      { name: "User Age Demographics", instance: window.ageChartInstance }, 
    ];

    charts.forEach((c) => {
      if (c.instance) {
        const labels = c.instance.data.labels || [];
        const values = c.instance.data.datasets[0].data || [];
        data.push(["Chart:", c.name]);
        data.push(["Label", "Value"]);
        labels.forEach((label, i) => data.push([label, values[i]]));
        data.push(["", ""]);
      }
    });

    if (!data.length) {
      alert("No chart data available to export.");
      return;
    }

    const csvContent = "data:text/csv;charset=utf-8," + data.map((r) => r.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = "dashboard_data.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ✅ PDF Export
  function exportChartsToPDF() {
    const jsPDF = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPDF) {
      alert("PDF library not loaded. Please check jsPDF script inclusion.");
      return;
    }

    const pdf = new jsPDF("p", "mm", "a4");
    let y = 15;

    const charts = [
      { name: "Translations per Day", canvas: "#translationsChart" },
      { name: "User Role Distribution", canvas: "#usersChart" },
      { name: "Translations per User", canvas: "#userUsageChart" },
      { name: "Input Type Usage", canvas: "#inputTypeChart" },
      { name: "Output Type Usage", canvas: "#outputTypeChart" },
      { name: "User Age Demographics", canvas: "#ageChart" },
    ];

    charts.forEach((c) => {
      const canvas = document.querySelector(c.canvas);
      if (canvas) {
        const imgData = canvas.toDataURL("image/png", 1.0);

        if (y + 95 > 280) { 
          pdf.addPage();
          y = 15;
        }

        pdf.text(c.name, 10, y);
        pdf.addImage(imgData, "PNG", 10, y + 5, 180, 80);
        y += 95;
      }
    });

    pdf.save("dashboard_report.pdf");
  }

  $(document).on("click", "#exportCSV", exportChartsToCSV);
  $(document).on("click", "#exportPDF", exportChartsToPDF);
});