document.addEventListener('DOMContentLoaded', () => {
  // Check if user is already logged in
  checkAuth();

  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const formLogin = document.getElementById('form-login');
  const formRegister = document.getElementById('form-register');
  const alertBox = document.getElementById('alert-box');

  const regSubmitBtn = formRegister.querySelector('.btn-submit');


  // Helper to show custom alerts
  function showAlert(message, type = 'danger') {
    alertBox.textContent = message;
    alertBox.style.display = 'block';
    
    if (type === 'danger') {
      alertBox.style.backgroundColor = 'var(--danger-bg)';
      alertBox.style.border = '1px solid var(--danger)';
      alertBox.style.color = '#fecaca';
    } else if (type === 'success') {
      alertBox.style.backgroundColor = 'var(--success-bg)';
      alertBox.style.border = '1px solid var(--success)';
      alertBox.style.color = '#a7f3d0';
    }
  }

  function hideAlert() {
    alertBox.style.display = 'none';
  }

  // Tab Switch Logic
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.add('active');
    formRegister.classList.remove('active');
    hideAlert();
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.add('active');
    formLogin.classList.remove('active');
    hideAlert();
  });

  // Login Submit Logic
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please verify credentials.');
      }

      // Save token and user info, then redirect
      setSession(data.token, data.user);
      
      if (data.user.role === 'admin') {
        window.location.href = '/admin.html';
      } else {
        window.location.href = '/dashboard.html';
      }
    } catch (err) {
      showAlert(err.message);
    }
  });

  // Register Submit Logic
  formRegister.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const adminSecret = document.getElementById('reg-secret').value;

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, adminSecret })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed. Try again.');
      }

      showAlert('Registration successful! Please login.', 'success');
      formRegister.reset();
      regSubmitBtn.textContent = 'Create Account';
      
      // Auto switch back to login tab after 2 seconds
      setTimeout(() => {
        tabLogin.click();
      }, 1500);
    } catch (err) {
      showAlert(err.message);
    }
  });
});
