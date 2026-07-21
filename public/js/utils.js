// Helper utilities for user authentication and API operations

const API_BASE = '/api';

// Retrieve token from LocalStorage
function getToken() {
  return localStorage.getItem('token');
}

// Retrieve user data from LocalStorage
function getUser() {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

// Set login session details
function setSession(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

// Clear login session details
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/';
}

// Generate authentication headers for Fetch API
function getAuthHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

// Check auth state on page load and redirect appropriately
function checkAuth(requiredRole = null) {
  const token = getToken();
  const user = getUser();
  const currentPath = window.location.pathname;

  if (!token || !user) {
    // If we are not on the login page, redirect to login
    if (currentPath !== '/' && currentPath !== '/index.html') {
      window.location.href = '/';
    }
    return null;
  }

  // If already logged in, prevent visiting login page
  if (currentPath === '/' || currentPath === '/index.html') {
    if (user.role === 'admin') {
      window.location.href = '/admin.html';
    } else {
      window.location.href = '/dashboard.html';
    }
    return user;
  }

  // Role restriction checks
  if (requiredRole && user.role !== requiredRole) {
    if (user.role === 'admin') {
      window.location.href = '/admin.html';
    } else {
      window.location.href = '/dashboard.html';
    }
  }

  return user;
}

// Setup common navbar details if element exists
document.addEventListener('DOMContentLoaded', () => {
  const navContainer = document.getElementById('navbar-container');
  if (navContainer) {
    const user = getUser();
    if (user) {
      const badgeClass = user.role === 'admin' ? 'badge-admin' : 'badge-student';
      navContainer.innerHTML = `
        <nav class="navbar">
          <div class="nav-brand">
            <span style="font-size: 1.8rem; vertical-align: middle;">🛡️</span>
            <span class="text-gradient">PROCTOR SHIELD</span>
          </div>
          <div class="nav-user">
            <span style="color: var(--text-secondary); font-weight: 500;">Hello, <strong>${user.username}</strong></span>
            <span class="badge ${badgeClass}">${user.role}</span>
            <button onclick="logout()" class="btn-logout">Logout</button>
          </div>
        </nav>
      `;
    }
  }
});
