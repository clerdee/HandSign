// =========================
// Learn More button - scroll to features
// =========================
const learnMoreBtn = document.getElementById('learnMoreBtn');
if (learnMoreBtn) {
    learnMoreBtn.addEventListener('click', function() {
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            featuresSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
}

// =========================
// Smooth scrolling for navigation links
// =========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// =========================
// Modal Elements
// =========================
const getStartedBtn = document.getElementById('getStartedBtn');
const authModal = document.getElementById('authModal');
const closeModalBtn = document.getElementById('closeModal');
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

// =========================
// Modal Logic
// =========================
if (getStartedBtn && authModal) {
    getStartedBtn.addEventListener('click', () => {
        authModal.style.display = 'flex';
    });
}

if (closeModalBtn && authModal) {
    closeModalBtn.addEventListener('click', () => {
        authModal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.style.display = 'none';
    }
});

function closeModal() {
    if (authModal) authModal.style.display = 'none';
}

// =========================
// Switch between Login & Register Tabs
// =========================
if (loginTab && registerTab && loginForm && registerForm) {
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    });

    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active');
        loginForm.classList.remove('active');
    });
}

// =========================
// ✅ LOGIN FORM SUBMISSION (fixed Flask compatibility)
// =========================
if (loginForm) {
  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const submitBtn = loginForm.querySelector('.btn-submit');

    if (!email || !password) {
      alert("Please fill in both fields.");
      return;
    }

    submitBtn.textContent = 'Signing in...';
    submitBtn.disabled = true;

    fetch('http://127.0.0.1:5000/api/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email, password })
    })
    .then(res => res.json().then(data => ({ status: res.status, body: data })))
    .then(({ status, body }) => {
      if (status === 200 && body.user) {
        // ✅ Store user info (optional)
        localStorage.setItem('user', JSON.stringify(body.user));

        alert(`Welcome, ${body.user.name} (${body.user.role})!`);
        closeModal();

        // ✅ Redirect by role
        if (body.user.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'index.html';
        }
      } else {
        alert(body.message || "Invalid email or password.");
      }
    })
    .catch(() => alert('Server error. Please try again later.'))
    .finally(() => {
      submitBtn.textContent = 'Login';
      submitBtn.disabled = false;
    });
  });
}

// =========================
// ✅ REGISTER FORM SUBMISSION
// =========================
if (registerForm) {
  registerForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const confirmPassword = document.getElementById('confirmPassword').value.trim();
    const submitBtn = registerForm.querySelector('.btn-submit');

    if (!name || !email || !password) {
      alert("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    submitBtn.textContent = 'Creating account...';
    submitBtn.disabled = true;

    fetch('http://127.0.0.1:5000/api/register', {  // ✅ Flask backend
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ name, email, password })
    })
    .then(res => res.json())
    .then(data => {
      alert(data.message);
      if (data.message.includes('successfully')) {
        // ✅ Automatically switch to login tab after register
        loginTab.click();
      }
    })
    .catch(() => alert('Server error. Try again later.'))
    .finally(() => {
      submitBtn.textContent = 'Register';
      submitBtn.disabled = false;
    });
  });
}

// =========================
// Navbar Scroll Shadow
// =========================
const navbar = document.querySelector('.navbar');
if (navbar) {
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 100) {
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.boxShadow = 'none';
        }
    });
}

// =========================
// Stats Animation
// =========================
const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const statNumbers = entry.target.querySelectorAll('.stat-number');
                statNumbers.forEach(stat => {
                    const finalValue = stat.textContent.replace(/\D/g, '');
                    if (!stat.classList.contains('animated')) {
                        animateValue(stat, 0, parseInt(finalValue), 2000);
                        stat.classList.add('animated');
                    }
                });
            }
        });
    }, { threshold: 0.5 });
    observer.observe(statsSection);
}

function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentValue = Math.floor(progress * (end - start) + start);
        element.textContent = currentValue + (element.textContent.includes('+') ? '+' : '');
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}

// =========================
// Feature Cards Scroll Animation
// =========================
const featureCards = document.querySelectorAll('.feature-card');
if (featureCards.length > 0) {
    const cardObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(30px)';
                setTimeout(() => {
                    entry.target.style.transition = 'all 0.6s ease';
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 100);
                cardObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });
    featureCards.forEach(card => cardObserver.observe(card));
}

// =========================
// Toggle Password Visibility
// =========================
document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    const targetId = icon.getAttribute('data-target');
    const passwordField = document.getElementById(targetId);
    if (passwordField) {
      const isPassword = passwordField.type === 'password';
      passwordField.type = isPassword ? 'text' : 'password';
      icon.textContent = isPassword ? '🙈' : '👁️';
    }
  });
});
