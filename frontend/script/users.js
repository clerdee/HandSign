async function initUsersTable() {
  const tableBody = document.querySelector("#usersTable tbody");
  if (!tableBody) {
    setTimeout(initUsersTable, 100);
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:5000/api/users");
    if (!response.ok) throw new Error("Failed to fetch users");

    const users = await response.json();
    tableBody.innerHTML = "";

    users.forEach((user) => {
      const row = document.createElement("tr");

      // Dropdown for role
      const roleSelect = `
        <select class="roleSelect" data-id="${user.id}">
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
          <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
        </select>
      `;

      row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${roleSelect}</td>
        <td><button class="saveBtn" data-id="${user.id}">Save</button></td>
      `;

      tableBody.appendChild(row);
    });

    // Add event listeners for Save buttons
    document.querySelectorAll(".saveBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const userId = btn.dataset.id;
        const newRole = btn
          .closest("tr")
          .querySelector(".roleSelect").value;

        const updateResponse = await fetch(
          `http://127.0.0.1:5000/api/users/${userId}/role`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ role: newRole }),
          }
        );

        const result = await updateResponse.json();
        if (updateResponse.ok) {
          alert("✅ Role updated successfully!");
        } else {
          alert("❌ Error: " + result.error);
        }
      });
    });
  } catch (err) {
    console.error("Error loading users:", err);
  }
}

initUsersTable();
