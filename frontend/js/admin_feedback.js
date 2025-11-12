// js/admin_feedback.js
try {
    $('#feedbackTable').DataTable({
        "ajax": {
            "url": "/api/admin/feedback", 
            "dataSrc": "" 
        },
        "columns": [
            { "data": "id" },
            { "data": "name" },
            { "data": "email" },
            { 
                "data": "rating",
                "render": function(data, type, row) {
                    let stars = '';
                    for (let i = 0; i < 5; i++) {
                        stars += `<span class="star ${i < data ? 'filled' : ''}">★</span>`;
                    }
                    return `<div class="rating-stars">${stars}</div>`;
                }
            },
            { 
                "data": "comment",
                "render": function(data, type, row) {
                    if (type === 'display' && data && data.length > 50) {
                        return `<span title="${data}">${data.substr(0, 50)}...</span>`;
                    }
                    return data || 'N/A';
                }
            },
            { 
                "data": "created_at",
                "render": function(data, type, row) {
                    return new Date(data).toLocaleString();
                }
            }
        ],
        // Enable export buttons (CSV, PDF)
        dom: "Bfrtip",
        buttons: [
          { extend: "copyHtml5", text: "📋 Copy", className: "btn btn-sm btn-outline-primary" },
          { extend: "csvHtml5", text: "📄 CSV", className: "btn btn-sm btn-outline-success" },
          { extend: "excelHtml5", text: "📊 Excel", className: "btn btn-sm btn-outline-info" },
          { extend: "pdfHtml5", text: "📕 PDF", className: "btn btn-sm btn-outline-danger" },
          { extend: "print", text: "🖨️ Print", className: "btn btn-sm btn-outline-dark" },
        ],
        "order": [[0, "desc"]], 
        "destroy": true 
    });

    if (!$('style#feedback-styles').length) {
        $('head').append(`
            <style id="feedback-styles">
                .rating-stars .star {
                    color: #ddd;
                    font-size: 1.1rem;
                }
                .rating-stars .star.filled {
                    color: #f7b731;
                }
                span[title] {
                    cursor: help;
                }
            </style>
        `);
    }

} catch (e) {
    console.error("Error initializing feedback DataTable:", e);
    $("#contentArea").html('<p class="error" style="color: red; text-align: center;">⚠️ Could not load feedback table. See console for details.</p>');
}