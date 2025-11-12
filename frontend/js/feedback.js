// js/feedback.js
(function loadFeedbackSection() {
    const feedbackSection = document.getElementById('feedback');
    if (!feedbackSection) return;

    fetch('sections/feedback.html')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            feedbackSection.innerHTML = html;

            initializeFeedbackForm();
        })
        .catch(error => {
            console.error('Error loading feedback section:', error);
            feedbackSection.innerHTML = '<p class="error-message">Could not load feedback form. Please try again later.</p>';
        });
})();

function initializeFeedbackForm() {
    const submitBtn = document.getElementById('submitFeedbackBtn');
    const statusEl = document.getElementById('feedbackStatus');
    const commentEl = document.getElementById('feedbackComment');

    if (submitBtn) {
        submitBtn.addEventListener('click', async () => {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user) {
                showStatus('You must be logged in to submit feedback.', 'error');
                return;
            }

            const ratingEl = document.querySelector('.star-rating input[name="rating"]:checked');
            if (!ratingEl) {
                showStatus('Please select a star rating.', 'error');
                return;
            }

            const rating = parseInt(ratingEl.value, 10);
            const comment = commentEl.value.trim();

            const feedbackData = {
                user_id: user.id,
                rating: rating,
                comment: comment
            };

            try {
                const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(feedbackData)
                });

                const data = await res.json();

                if (res.ok) {
                    showStatus('Thank you for your feedback!', 'success');
                    const checkedRadio = document.querySelector('.star-rating input[name="rating"]:checked');
                    if (checkedRadio) {
                        checkedRadio.checked = false;
                    }
                    commentEl.value = '';
                } else {
                    showStatus(data.message || 'An error occurred.', 'error');
                }
            } catch (err) {
                console.error('Feedback submission error:', err);
                showStatus('A network error occurred. Please try again.', 'error');
            }
        });
    }

    function showStatus(message, type) {
        statusEl.textContent = message;
        statusEl.className = type; 
    }
}