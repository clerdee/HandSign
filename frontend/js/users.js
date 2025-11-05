$(document).ready(function () {
  let usersTable;

  // ==========================
  // LOAD USERS INTO DATATABLE
  // ==========================
  function loadUsersTable() {
    $.ajax({
      url: "http://127.0.0.1:5000/api/users",
      method: "GET",
      dataType: "json",
      success: function (data) {
        if ($.fn.DataTable.isDataTable("#usersTable")) {
          usersTable.clear().destroy();
        }

        // Rebuild table body
        $("#usersTable tbody").empty();
        data.forEach(function (user) {
          $("#usersTable tbody").append(`
            <tr>
              <td>${user.id}</td>
              <td>${user.name}</td>
              <td>${user.email}</td>
              <td>
                <select class="role-select" data-id="${user.id}">
                  <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
                  <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                </select>
              </td>
              <td>
                <button class="update-role-btn btn btn-sm btn-primary" data-id="${user.id}">Update</button>
              </td>
            </tr>
          `);
        });

        usersTable = $("#usersTable").DataTable({
          responsive: true,
          order: [[0, "asc"]],
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
            lengthMenu: "Show _MENU_ users per page",
            zeroRecords: "No users found",
            info: "Showing _START_ to _END_ of _TOTAL_ users",
            infoEmpty: "No users available",
            infoFiltered: "(filtered from _MAX_ total users)",
          },
          pageLength: 10,
        });
      },
      error: function (xhr, status, error) {
        console.error("Error fetching users:", error);
      },
    });
  }

  // ==========================
  // UPDATE USER ROLE
  // ==========================
  $(document).on("click", ".update-role-btn", function () {
    const userId = $(this).data("id");
    const newRole = $(this).closest("tr").find(".role-select").val();

    $.ajax({
      url: `http://127.0.0.1:5000/api/users/${userId}`,
      method: "PUT",
      contentType: "application/json",
      data: JSON.stringify({ role: newRole }),
      success: function (res) {
        alert("✅ Role updated successfully!");
        loadUsersTable();
      },
      error: function (xhr, status, error) {
        alert("❌ Error updating role: " + error);
      },
    });
  });

  // ==========================
  // NAVIGATION HANDLER
  // ==========================
  $(document).on("click", '.nav-link[data-section="users"]', function (e) {
    e.preventDefault();
    $("#sectionTitle").text("Manage Users");

    $("#contentArea").load("sections/users.html", function () {
      loadUsersTable();
    });

    $(".nav-link").removeClass("active");
    $(this).addClass("active");
  });
});
