// ===============================
// TRANSLATIONS TABLE (DataTables)
// ===============================

$(document).on("click", '.nav-link[data-section="translation"]', function (e) {
  e.preventDefault();

  $("#sectionTitle").text("Translations");

  $("#contentArea").load("sections/translation.html", function () {
    loadTranslationsTable();
  });

  $(".nav-link").removeClass("active");
  $(this).addClass("active");
});

// ==================================
// MAIN FUNCTION TO LOAD TRANSLATIONS
// ==================================
function loadTranslationsTable() {
  const tableEl = $("#translationsTable");

  if (!tableEl.length) {
    console.warn("⚠️ #translationsTable not found in DOM yet.");
    return;
  }

  if ($.fn.DataTable.isDataTable("#translationsTable")) {
    $("#translationsTable").DataTable().destroy();
  }

  $("#translationsTable tbody").empty();

  $.ajax({
    url: "http://127.0.0.1:5000/api/translations",
    method: "GET",
    dataType: "json",
    success: function (data) {
      const tbody = $("#translationsTable tbody");
      tbody.empty();

      data.forEach((t) => {
        const row = `
          <tr>
            <td>${t.id}</td>
            <td>${t.user_id}</td>
            <td>${t.gesture_name ?? "NULL"}</td>
            <td>${t.input_type ?? "NULL"}</td>
            <td>${t.output_type ?? "NULL"}</td>
            <td>${t.translated_text ?? "NULL"}</td>
            <td>${t.created_at ? new Date(t.created_at).toLocaleString() : "NULL"}</td>
          </tr>
        `;
        tbody.append(row);
      });

      $("#translationsTable").DataTable({
        responsive: true,
        order: [[0, "desc"]],
        pageLength: 50,
        dom: "Bfrtip",
        buttons: [
          { extend: "copyHtml5", text: "📋 Copy", className: "btn btn-sm btn-outline-primary" },
          { extend: "csvHtml5", text: "📄 CSV", className: "btn btn-sm btn-outline-success" },
          { extend: "excelHtml5", text: "📊 Excel", className: "btn btn-sm btn-outline-info" },
          { extend: "pdfHtml5", text: "📕 PDF", className: "btn btn-sm btn-outline-danger" },
          { extend: "print", text: "🖨️ Print", className: "btn btn-sm btn-outline-dark" },
        ],
        language: {
          search: "🔍 Search:",
          lengthMenu: "Show _MENU_ records per page",
          zeroRecords: "No translations found",
          info: "Showing _START_ to _END_ of _TOTAL_ translations",
          infoEmpty: "No records available",
          infoFiltered: "(filtered from _MAX_ total translations)",
        },
      });
    },
    error: function (xhr, status, error) {
      console.error("❌ Error fetching translations:", error);
    },
  });
}
