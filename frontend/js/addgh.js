$(document).ready(function () {
  const collectBtn = $("#collectGestureBtn");
  const trainBtn = $("#trainModelBtn");
  const resetBtn = $("#resetFormBtn");
  const statusMsg = $("#statusMessage");
  const preview = $("#gesturePreview");

  function validateForm() {
    const name = $("#gestureName").val().trim();
    const label = $("#gestureLabel").val();
    const description = $("#gestureDescription").val().trim();

    if (!name) {
      alert("Please enter a gesture name.");
      return false;
    }
    if (!label) {
      alert("Please select a gesture label (Letter, Word, or Special).");
      return false;
    }
    if (!description) {
      alert("Please provide a description for this gesture.");
      return false;
    }
    return true;
  }

  const gesturesTable = $("#gesturesTable").DataTable({
    ajax: {
      url: "http://127.0.0.1:5000/api/gestures",
      dataSrc: "",
    },
    columns: [
      { data: "id" },
      { data: "gesture_name" },
      { data: "gesture_label" },
      { data: "description" },
      { data: "created_by" },
      {
        data: "created_at",
        render: function (data) {
          return data ? new Date(data).toLocaleString() : "-";
        },
      },
      {
        data: null,
        render: function (data, type, row) {
          return `
            <button class="btn small edit-btn" data-id="${row.id}">
              <i class="fa-solid fa-pen"></i>
            </button>
            <button class="btn small danger delete-btn" data-id="${row.id}">
              <i class="fa-solid fa-trash"></i>
            </button>
          `;
        },
      },
    ],

  dom: "Bfrtip",
  buttons: [
    { extend: "copyHtml5", text: "📋 Copy", className: "btn btn-sm btn-outline-primary" },
    { extend: "csvHtml5", text: "📄 CSV", className: "btn btn-sm btn-outline-success" },
    { extend: "excelHtml5", text: "📊 Excel", className: "btn btn-sm btn-outline-info" },
    { extend: "pdfHtml5", text: "📕 PDF", className: "btn btn-sm btn-outline-danger" },
    { extend: "print", text: "🖨️ Print", className: "btn btn-sm btn-outline-dark" },
  ],

    pageLength: 50, 
    lengthMenu: [
      [10, 25, 50, 100],
      [10, 25, 50, 100],
    ],

    responsive: true,
    order: [[0, "desc"]],
    language: {
      search: "🔍 Search:",
      lengthMenu: "Show _MENU_ gestures per page",
      zeroRecords: "No gestures found",
      info: "Showing _START_ to _END_ of _TOTAL_ gestures",
      infoEmpty: "No gestures available",
      infoFiltered: "(filtered from _MAX_ total gestures)",
    },
  });

  collectBtn.on("click", async function () {
    if (!validateForm()) return;

    const payload = {
      gesture_name: $("#gestureName").val().trim(),
      gesture_label: $("#gestureLabel").val(),
      description: $("#gestureDescription").val().trim(),
      created_by: $("#createdBy").val() || 1,
    };

    try {
      statusMsg.html(
        `<p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Saving gesture info and launching camera...</p>`
      );
      preview.html(`<p class="placeholder-text">Preparing camera window...</p>`);

      console.log("Sending request to backend:", payload);

      const response = await fetch("http://127.0.0.1:5000/api/collect_images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        statusMsg.html(
          `<p class="success-text"><i class="fa-solid fa-check"></i> ${
            data.message ||
            `Camera launched successfully for '${payload.gesture_name}'.`
          }</p>`
        );

        preview.html(
          `<p><strong>Gesture:</strong> ${payload.gesture_name}<br>
             <strong>Label:</strong> ${payload.gesture_label}<br>
             <strong>Status:</strong> Camera window should open shortly.<br><br>
             <em>👉 In the new window: Press <strong>Q</strong> to start capturing, then wait until it finishes.</em></p>`
        );

        $("#trainModelBtnContainer").show();
        gesturesTable.ajax.reload(null, false);
      } else {
        statusMsg.html(
          `<p class="error-text"><i class="fa-solid fa-triangle-exclamation"></i> ${
            data.message || "Error: Could not start gesture collection."
          }</p>`
        );
      }
    } catch (err) {
      console.error("Error:", err);
      statusMsg.html(
        `<p class="error-text"><i class="fa-solid fa-bug"></i> Failed to connect to backend. Make sure Flask is running.</p>`
      );
    }
  });

  trainBtn.on("click", async function () {
    try {
      statusMsg.html(
        `<p class="loading-text"><i class="fa-solid fa-spinner fa-spin"></i> Creating dataset and training model. This may take a few minutes...</p>`
      );

      const response = await fetch("http://127.0.0.1:5000/api/train_model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok) {
        statusMsg.html(
          `<p class="success-text"><i class="fa-solid fa-check"></i> ${
            data.message || "Dataset created and model trained successfully!"
          }</p>`
        );

        preview.html(
          `<p><strong>Status:</strong> Model training complete!<br>
             <strong>Result:</strong> The new word has been added to the system and is ready for use.<br>
             <strong>Next Steps:</strong> You can now use this gesture in the translation system.</p>`
        );
      } else {
        statusMsg.html(
          `<p class="error-text"><i class="fa-solid fa-triangle-exclamation"></i> ${
            data.message || "Error: Could not train the model."
          }</p>`
        );
      }
    } catch (err) {
      console.error("Error:", err);
      statusMsg.html(
        `<p class="error-text"><i class="fa-solid fa-bug"></i> Failed to connect to backend. Make sure Flask is running.</p>`
      );
    }
  });

  $("#gesturesTable").on("click", ".delete-btn", function () {
    const id = $(this).data("id");
    if (confirm("Are you sure you want to delete this gesture?")) {
      $.ajax({
        url: `http://127.0.0.1:5000/api/gestures/${id}`,
        type: "DELETE",
        success: function () {
          gesturesTable.ajax.reload(null, false);
        },
        error: function (err) {
          alert("Error deleting gesture");
          console.error(err);
        },
      });
    }
  });

  resetBtn.on("click", function () {
    $("#addGestureForm")[0].reset();
    $("#gestureLabel").val("");
    preview.html(`<p class="placeholder-text">Camera not started yet.</p>`);
    statusMsg.html(
      `<p>Fill the form, then click "Add New Gesture" to start the camera.</p>`
    );
    $("#trainModelBtnContainer").hide();
  });

  $("#trainModelBtnContainer").hide();
});
