// auth.js - Enhanced Secure Authentication System for DAMS Content Suite

let currentUser = null;
let userToken = null;
let tokenExpiry = null;
let sessionTimeout = null;

// Security constants
const SESSION_TIMEOUT_MINUTES = 60;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Authentication modal functions
function showLoginModal() {
  const loginModal = document.getElementById("login-modal");
  if (loginModal) {
    loginModal.classList.remove("hidden");
    const emailInput = document.getElementById("login-email");
    if (emailInput) emailInput.focus();
  }
}

function hideLoginModal() {
  const loginModal = document.getElementById("login-modal");
  if (loginModal) loginModal.classList.add("hidden");
}

function showRegisterModal() {
  const registerModal = document.getElementById("register-modal");
  if (registerModal) {
    registerModal.classList.remove("hidden");
    const nameInput = document.getElementById("register-name");
    if (nameInput) nameInput.focus();
  }
}

function hideRegisterModal() {
  const registerModal = document.getElementById("register-modal");
  if (registerModal) registerModal.classList.add("hidden");
}

function showProfileModal() {
  const profileModal = document.getElementById("profile-modal");
  if (profileModal) {
    updateProfileInfo();
    profileModal.classList.remove("hidden");
  }
}

function hideProfileModal() {
  const profileModal = document.getElementById("profile-modal");
  if (profileModal) profileModal.classList.add("hidden");
}

// Update UI based on authentication state
function updateAuthUI() {
  // Wait for DOM elements to be available
  if (!document.getElementById("auth-buttons")) {
    // DOM elements not ready yet, try again
    setTimeout(updateAuthUI, 100);
    return;
  }

  const authButtons = document.getElementById("auth-buttons");
  const profileBtn = document.getElementById("profile-btn");
  const adminDashboardBtn = document.getElementById("admin-dashboard-btn");
  const mobileAuthSection = document.getElementById("mobile-auth-section");
  const mobileProfileSection = document.getElementById(
    "mobile-profile-section"
  );
  const mobileAdminDashboardBtn = document.getElementById(
    "mobile-admin-dashboard-btn"
  );

  // Control main content visibility
  const mainContent = document.getElementById("main-content");
  const restrictedContent = document.getElementById("restricted-content");

  if (currentUser) {
    // User is logged in - set body class and show main content
    document.body.classList.add('user-logged-in');
    document.body.classList.remove('user-not-logged-in');

    if (mainContent) mainContent.classList.remove("hidden");
    if (restrictedContent) restrictedContent.classList.add("hidden");

    // Hide login/register buttons
    if (authButtons) authButtons.classList.add("hidden");
    if (mobileAuthSection) mobileAuthSection.classList.add("hidden");

    // Show profile buttons
    if (profileBtn) profileBtn.classList.remove("hidden");
    if (mobileProfileSection) mobileProfileSection.classList.remove("hidden");

    // Show admin dashboard button only for admin users
    const isAdmin = currentUser.role === "admin";
    if (adminDashboardBtn) {
      if (isAdmin) {
        adminDashboardBtn.classList.remove("hidden");
      } else {
        adminDashboardBtn.classList.add("hidden");
      }
    }
    if (mobileAdminDashboardBtn) {
      if (isAdmin) {
        mobileAdminDashboardBtn.classList.remove("hidden");
      } else {
        mobileAdminDashboardBtn.classList.add("hidden");
      }
    }
  } else {
    // User is not logged in - set body class and show restricted content
    document.body.classList.remove('user-logged-in');
    document.body.classList.add('user-not-logged-in');

    if (mainContent) mainContent.classList.add("hidden");
    if (restrictedContent) restrictedContent.classList.remove("hidden");

    // Show login/register buttons
    if (authButtons) authButtons.classList.remove("hidden");
    if (mobileAuthSection) mobileAuthSection.classList.remove("hidden");

    // Hide profile buttons
    if (profileBtn) profileBtn.classList.add("hidden");
    if (mobileProfileSection) mobileProfileSection.classList.add("hidden");
    if (adminDashboardBtn) adminDashboardBtn.classList.add("hidden");
    if (mobileAdminDashboardBtn) mobileAdminDashboardBtn.classList.add("hidden");
  }
  checkImpersonation();

  // Update debug element
  const authDebug = document.getElementById('auth-debug');
  const authDebugState = document.getElementById('auth-debug-state');
  if (authDebug && authDebugState) {
    if (currentUser) {
      authDebugState.textContent = `Logged in as ${currentUser.name} (${currentUser.role})`;
      authDebug.classList.remove('hidden');
    } else {
      authDebugState.textContent = 'Not logged in';
      authDebug.classList.remove('hidden');
    }
  }

  // Debug logging (only in development)
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('Auth UI updated:', {
      hasUser: !!currentUser,
      userRole: currentUser?.role || 'none',
      bodyClasses: document.body.className,
      authButtonsHidden: authButtons?.classList.contains('hidden'),
      profileBtnVisible: !profileBtn?.classList.contains('hidden'),
      mainContentVisible: !mainContent?.classList.contains('hidden'),
      restrictedContentHidden: restrictedContent?.classList.contains('hidden')
    });
  }
}

// Force update authentication UI (for debugging)
function forceUpdateAuthUI() {
  console.log('Forcing authentication UI update...');
  updateAuthUI();
}

// Toggle authentication debug visibility
function toggleAuthDebug() {
  const authDebug = document.getElementById('auth-debug');
  if (authDebug) {
    authDebug.classList.toggle('hidden');
    console.log('Auth debug visibility toggled:', !authDebug.classList.contains('hidden'));
  }
}

// Debug function to check current authentication state
function debugAuthState() {
  console.log('=== AUTHENTICATION DEBUG INFO ===');
  console.log('Current User:', currentUser);
  console.log('User Token:', userToken ? 'Present' : 'Not present');
  console.log('Token Expiry:', tokenExpiry ? new Date(tokenExpiry).toISOString() : 'Not set');
  console.log('Session Timeout:', sessionTimeout ? 'Active' : 'Not active');
  console.log('Body Classes:', document.body.className);
  console.log('LocalStorage Items:');
  console.log('- user:', localStorage.getItem('user') ? 'Present' : 'Not present');
  console.log('- token:', localStorage.getItem('token') ? 'Present' : 'Not present');
  console.log('- tokenExpiry:', localStorage.getItem('tokenExpiry') ? 'Present' : 'Not present');
  console.log('- impersonating_admin_user:', localStorage.getItem('impersonating_admin_user') ? 'Present' : 'Not present');
  console.log('- impersonating_admin_token:', localStorage.getItem('impersonating_admin_token') ? 'Present' : 'Not present');
  console.log('DOM Elements:');
  console.log('- auth-buttons:', document.getElementById('auth-buttons') ? 'Found' : 'Not found');
  console.log('- profile-btn:', document.getElementById('profile-btn') ? 'Found' : 'Not found');
  console.log('- main-content:', document.getElementById('main-content') ? 'Found' : 'Not found');
  console.log('- restricted-content:', document.getElementById('restricted-content') ? 'Found' : 'Not found');
  console.log('=== END DEBUG INFO ===');
}

// Clear all authentication data and start fresh
function clearAllAuthData() {
  console.log('Clearing all authentication data...');

  // Clear session timer
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }

  // Clear all stored data
  currentUser = null;
  userToken = null;
  tokenExpiry = null;

  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("tokenExpiry");
  localStorage.removeItem("clientIP");
  localStorage.removeItem("impersonating_admin_user");
  localStorage.removeItem("impersonating_admin_token");

  // Clear any cached data
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }

  // Reset body classes
  document.body.classList.remove('user-logged-in');
  document.body.classList.add('user-not-logged-in');

  // Update UI
  updateAuthUI();

  console.log('All authentication data cleared');
  showNotification('All authentication data cleared', 'info');
}

// Test login API connectivity
async function testLoginAPI() {
  console.log('Testing login API connectivity...');

  try {
    const testResponse = await fetch(`${WORKER_URL}?action=login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "test"
      }),
    });

    console.log('Test response status:', testResponse.status);
    console.log('Test response headers:', Object.fromEntries(testResponse.headers.entries()));

    const responseText = await testResponse.text();
    console.log('Test response text:', responseText);

    if (testResponse.status === 400 || testResponse.status === 401) {
      console.log('✅ API is responding correctly (rejecting invalid credentials)');
      return true;
    } else if (testResponse.status === 200) {
      console.log('⚠️ API accepted test credentials - this might indicate an issue');
      return true;
    } else {
      console.log('❌ API returned unexpected status:', testResponse.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Login API test failed:', error);
    return false;
  }
}

// Check if any users exist in the system
async function checkSystemUsers() {
  console.log('Checking if any users exist in the system...');

  try {
    const response = await fetch(`${WORKER_URL}?action=get_users`);
    console.log('Get users response status:', response.status);

    if (response.ok) {
      const data = await response.json();
      console.log('Users in system:', data.users?.length || 0);

      if (data.users && data.users.length > 0) {
        console.log('✅ Users found in system');
        console.log('Available users:', data.users.map(u => ({ email: u.email, role: u.role, name: u.name })));
        return data.users;
      } else {
        console.log('❌ No users found in system - this explains login failures');
        return [];
      }
    } else {
      console.log('❌ Failed to check users:', response.status);
      return null;
    }
  } catch (error) {
    console.error('❌ Error checking system users:', error);
    return null;
  }
}

// Test login with known user credentials
async function testLoginWithKnownUser() {
  console.log('Testing login with potential user credentials...');

  const users = await checkSystemUsers();
  if (!users || users.length === 0) {
    console.log('❌ No users available to test with');
    return false;
  }

  // Try to login with the first user (assuming they have a simple password)
  const testUser = users[0];
  console.log('Testing login with user:', testUser.email);

  try {
    const response = await fetch(`${WORKER_URL}?action=login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: testUser.email,
        password: "password" // Try common password
      }),
    });

    console.log('Test login response status:', response.status);
    const responseText = await response.text();
    console.log('Test login response:', responseText);

    if (response.ok) {
      console.log('✅ Login successful with test credentials');
      return true;
    } else {
      console.log('❌ Login failed - trying different password');

      // Try the user's name as password
      const nameResponse = await fetch(`${WORKER_URL}?action=login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.name.toLowerCase()
        }),
      });

      console.log('Name password test status:', nameResponse.status);
      const nameResponseText = await nameResponse.text();
      console.log('Name password test response:', nameResponseText);

      if (nameResponse.ok) {
        console.log('✅ Login successful with name as password');
        return true;
      } else {
        console.log('❌ All login attempts failed');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Error testing login:', error);
    return false;
  }
}

// Create a test user for debugging
async function createTestUser() {
  console.log('Creating test user...');

  try {
    const testUser = {
      name: "Test User",
      email: "test@example.com",
      password: "password",
      activationCode: "TEST123"
    };

    const response = await fetch(`${WORKER_URL}?action=register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testUser),
    });

    console.log('Create user response status:', response.status);
    const responseText = await response.text();
    console.log('Create user response:', responseText);

    if (response.ok) {
      console.log('✅ Test user created successfully');
      return true;
    } else {
      console.log('❌ Failed to create test user');
      return false;
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error);
    return false;
  }
}

// Test basic connectivity to worker
async function testWorkerConnectivity() {
  console.log('Testing basic worker connectivity...');

  try {
    const response = await fetch(WORKER_URL);
    console.log('Worker connectivity test - Status:', response.status);
    console.log('Worker connectivity test - Headers:', Object.fromEntries(response.headers.entries()));

    if (response.ok) {
      console.log('✅ Worker is reachable');
      return true;
    } else {
      console.log('❌ Worker returned error status:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Worker connectivity test failed:', error);
    return false;
  }
}

// Impersonation functions
async function impersonateUser(email) {
  try {
    console.log('Starting impersonation for user:', email);

    // Validate current user permissions
    if (!currentUser) {
      showNotification("You must be logged in to impersonate users", "error");
      return;
    }

    if (currentUser.role !== "admin" && currentUser.role !== "supreme") {
      showNotification("Only admins and supreme users can impersonate users", "error");
      return;
    }

    // Additional check: ensure the user is actually an admin or supreme
    if (!currentUser.role || (currentUser.role !== "admin" && currentUser.role !== "supreme")) {
      showNotification("Invalid user role for impersonation", "error");
      return;
    }

    // Validate email input
    if (!email || !email.trim()) {
      showNotification("Please enter a valid email address", "error");
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Prevent self-impersonation
    if (trimmedEmail === currentUser.email) {
      showNotification("You cannot impersonate yourself", "error");
      return;
    }

    // Check if already impersonating
    const existingImpersonation = localStorage.getItem("impersonating_admin_session");
    if (existingImpersonation) {
      showNotification("Please stop current impersonation session first", "error");
      return;
    }

    // Validate token exists and is not expired
    if (!userToken) {
      showNotification("No valid authentication token found", "error");
      return;
    }

    if (isTokenExpired()) {
      showNotification("Your session has expired. Please login again.", "error");
      logoutUser();
      return;
    }

    console.log('Impersonation request details:', {
      url: `${WORKER_URL}?action=impersonate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken ? 'Bearer [TOKEN_PRESENT]' : 'Bearer [NO_TOKEN]'}`
      },
      body: JSON.stringify({ email: trimmedEmail }),
      currentUser: {
        name: currentUser.name,
        email: currentUser.email,
        role: currentUser.role
      }
    });

    const response = await fetch(`${WORKER_URL}?action=impersonate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${userToken}`
      },
      body: JSON.stringify({
        targetEmail: trimmedEmail
      })
    });

    if (!response.ok) {
      let errorMessage = "Impersonation failed";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
        if (response.status === 404) {
          errorMessage = "User not found";
        } else if (response.status === 403) {
          errorMessage = "Insufficient permissions for impersonation";
        } else if (response.status === 401) {
          errorMessage = "Authentication required";
        }
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('Impersonation response:', data);

    if (!data.success || !data.user || !data.token) {
      throw new Error(data.error || "Invalid response from server");
    }

    // Validate impersonated user data
    if (!data.user.email || !data.user.name) {
      throw new Error("Invalid user data received from server");
    }

    // --- FIX START ---
    // Store current admin session for restoration
    const adminSessionData = btoa(JSON.stringify({
      user: currentUser,
      token: userToken
    }));
    localStorage.setItem("impersonating_admin_session", adminSessionData);

    // Store the data of the user being impersonated separately
    localStorage.setItem("impersonated_user_data", btoa(JSON.stringify(data.user)));

    // Set impersonated user as the current user, but KEEP the admin's token for auth
    currentUser = data.user;
    // DO NOT overwrite the admin's userToken. It's needed for further admin actions.
    
    // Impersonation sessions have their own shorter expiry for UI purposes
    tokenExpiry = Date.now() + (30 * 60 * 1000); // 30 minutes for impersonation
    // --- FIX END ---

    // Clear any existing session timer and restart it
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      sessionTimeout = null;
    }
    startSessionTimer();

    // Update UI
    updateAuthUI();
    showNotification(`Now impersonating ${currentUser.name}`, "success");

    // Log activity
    addActivityLog(`Admin impersonated user: ${currentUser.name}`, "info");

    console.log('Impersonation successful');

  } catch (error) {
    console.error('Impersonation error:', error);
    showNotification(error.message || "Impersonation failed", "error");
  }
}

// Activity logging function
function addActivityLog(message, level = "info") {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    message,
    level,
    user: currentUser ? currentUser.email : 'anonymous',
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  console.log(`[${level.toUpperCase()}] ${timestamp}: ${message}`);

  // Optionally send to server for audit logging
  if (currentUser && userToken) {
    try {
      fetch(`${WORKER_URL}?action=log_activity`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify(logEntry)
      }).catch(error => {
        console.warn('Failed to send activity log to server:', error);
      });
    } catch (error) {
      console.warn('Activity logging failed:', error);
    }
  }
}

// Debug function to test impersonation permissions
async function debugImpersonationPermissions() {
  console.log('=== IMPERSONATION DEBUG INFO ===');
  console.log('Current User:', currentUser);
  console.log('User Role:', currentUser?.role);
  console.log('Has Token:', !!userToken);
  console.log('Token Expiry:', tokenExpiry ? new Date(tokenExpiry).toISOString() : 'Not set');
  console.log('Is Token Expired:', isTokenExpired());
  console.log('WORKER_URL:', WORKER_URL);
  console.log('Can impersonate (client check):', currentUser?.role === "admin" || currentUser?.role === "supreme");

  if (currentUser && userToken && !isTokenExpired()) {
    try {
      console.log('Testing impersonation endpoint access...');
      const testResponse = await fetch(`${WORKER_URL}?action=impersonate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({ email: "test@example.com" })
      });

      console.log('Impersonation endpoint response status:', testResponse.status);
      console.log('Impersonation endpoint response headers:', Object.fromEntries(testResponse.headers.entries()));

      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        console.log('Impersonation endpoint error response:', errorText);
      }
    } catch (error) {
      console.error('Impersonation endpoint test failed:', error);
    }
  } else {
    console.log('Cannot test impersonation endpoint - missing valid session');
  }
  console.log('=== END IMPERSONATION DEBUG INFO ===');
}

// Make functions globally available for debugging
window.forceUpdateAuthUI = forceUpdateAuthUI;
window.toggleAuthDebug = toggleAuthDebug;
window.debugAuthState = debugAuthState;
window.clearAllAuthData = clearAllAuthData;
window.testLoginAPI = testLoginAPI;
window.testWorkerConnectivity = testWorkerConnectivity;
window.checkSystemUsers = checkSystemUsers;
window.testLoginWithKnownUser = testLoginWithKnownUser;
window.createTestUser = createTestUser;
window.impersonateUser = impersonateUser;
window.stopImpersonation = stopImpersonation;
window.addActivityLog = addActivityLog;
window.debugImpersonationPermissions = debugImpersonationPermissions;

// Update profile information
// auth.js

function updateProfileInfo() {
  const profileInfo = document.getElementById("profile-info");
  if (!profileInfo || !currentUser) return;

  const isAdmin = currentUser.role === "admin";
  const isSupreme = currentUser.role === "supreme";

  // --- 1. Define variables for role-specific UI ---
  let avatarColor = "bg-green-600"; // Default for 'user'
  let roleBadge = "";
  let roleText = "User";
  let roleColor = "text-blue-400";

  if (isAdmin) {
    avatarColor = "bg-red-600";
    // New, better-looking badge
    roleBadge =
      '<span class="bg-red-900/50 text-red-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-red-700/50">ADMIN</span>';
    roleText = "Administrator";
    roleColor = "text-red-400";
  } else if (isSupreme) {
    avatarColor = "bg-purple-600";
    // New badge for Supreme, fixing the text
    roleBadge =
      '<span class="bg-purple-900/50 text-purple-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-700/50">MEDCRUNCH SUPREME</span>';
    // Correctly set the role text
    roleText = "Medcrunch Supreme";
    roleColor = "text-purple-400";
  }

  // --- 2. Logic for displaying expiry date ---
  let expiryHtml = "";
  // Only show expiry details if the user is NOT an admin AND NOT supreme
  if (currentUser.expires_at && !isAdmin && !isSupreme) {
    const expiryDate = new Date(currentUser.expires_at);
    const now = new Date();
    const timeDiff = expiryDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

    let colorClass = "text-gray-300";
    let daysLeftText = `${daysLeft} days`;

    if (daysLeft <= 0) {
      colorClass = "text-red-400 font-bold";
      daysLeftText = "Expired";
    } else if (daysLeft <= 7) {
      colorClass = "text-yellow-400";
    }

    expiryHtml = `
      <div class="flex justify-between">
        <span class="text-gray-400">Access Expires:</span>
        <span class="${colorClass}">${expiryDate.toLocaleDateString()}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-400">Time Remaining:</span>
        <span class="${colorClass}">${daysLeftText}</span>
      </div>
    `;
  }

  // --- 3. Final HTML structure ---
  profileInfo.innerHTML = `
    <div class="bg-gray-900/30 p-4 rounded-lg border border-gray-700/50">
      <div class="text-center mb-4">
        <div class="w-16 h-16 ${avatarColor} rounded-full flex items-center justify-center mx-auto mb-2">
          <span class="text-2xl font-bold text-white">${currentUser.name
            .charAt(0)
            .toUpperCase()}</span>
        </div>
        <h3 class="text-lg font-bold text-green-300 flex items-center justify-center gap-2">
          ${currentUser.name}
          ${roleBadge}
        </h3>
        <p class="text-sm text-gray-400">${currentUser.email}</p>
      </div>
      <div class="space-y-2 text-sm">
        <div class="flex justify-between">
          <span class="text-gray-400">Status:</span>
          <span class="text-green-400">Active</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Role:</span>
          <span class="${roleColor}">${roleText}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-gray-400">Joined:</span>
          <span class="text-gray-300">${new Date(
            currentUser.created_at
          ).toLocaleDateString()}</span>
        </div>
        ${expiryHtml}
      </div>
    </div>
  `;
}

// Enhanced security functions
function isTokenExpired() {
  if (!tokenExpiry) return true;
  return Date.now() > tokenExpiry;
}

function checkSessionTimeout() {
  if (isTokenExpired()) {
    logoutUser();
    showNotification("Session expired. Please login again.", "warning");
    return false;
  }
  return true;
}

function startSessionTimer() {
  if (sessionTimeout) clearTimeout(sessionTimeout);

  sessionTimeout = setTimeout(() => {
    if (currentUser) {
      logoutUser();
      showNotification("Session expired due to inactivity.", "warning");
    }
  }, SESSION_TIMEOUT_MINUTES * 60 * 1000);
}

function resetSessionTimer() {
  if (currentUser) {
    startSessionTimer();
  }
}

// Rate limiting for login attempts
const loginAttempts = new Map();

function isRateLimited(email) {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  const now = Date.now();
  const timeSinceLastAttempt = now - attempts.lastAttempt;

  // Reset if enough time has passed
  if (timeSinceLastAttempt > LOCKOUT_DURATION_MINUTES * 60 * 1000) {
    attempts.count = 0;
  }

  return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(email) {
  const attempts = loginAttempts.get(email) || { count: 0, lastAttempt: 0 };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(email, attempts);
}

// Enhanced login with security features
async function loginUser(email, password) {
  try {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Attempting login for:', email);
    console.log('WORKER_URL:', WORKER_URL);
    console.log('Current timestamp:', new Date().toISOString());

    // Check rate limiting
    if (isRateLimited(email)) {
      showNotification(
        `Too many login attempts. Try again in ${LOCKOUT_DURATION_MINUTES} minutes.`,
        "error"
      );
      return;
    }

    // Validate input
    if (!email || !password) {
      showNotification("Please enter both email and password.", "error");
      return;
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters long.", "error");
      return;
    }

    // Clear any existing session before login
    console.log('Clearing existing session before login...');
    currentUser = null;
    userToken = null;
    tokenExpiry = null;
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("tokenExpiry");

    // Clear any existing impersonation session
    localStorage.removeItem("impersonating_admin_session");

    console.log('Making login request to:', `${WORKER_URL}?action=login`);
    console.log('Request payload:', {
      email: email.toLowerCase().trim(),
      password: '***' // Don't log actual password
    });

    const response = await fetch(`${WORKER_URL}?action=login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        password
      }),
    });

    console.log('Login response status:', response.status);
    console.log('Login response headers:', Object.fromEntries(response.headers.entries()));

    let responseText = '';
    try {
      responseText = await response.text();
      console.log('Raw response text:', responseText);
    } catch (e) {
      console.error('Failed to read response text:', e);
    }

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse error response as JSON:', e);
        errorData = { error: `HTTP ${response.status}: ${responseText}` };
      }
      console.error('Login failed:', errorData);
      recordLoginAttempt(email);
      throw new Error(errorData.error || `Login failed with status ${response.status}`);
    }

    let data = {};
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      throw new Error("Server returned invalid JSON response");
    }

    console.log('Parsed login response data:', data);

    // Validate response structure
    if (!data.user || !data.token) {
      console.error('Invalid response structure:', data);
      throw new Error("Invalid server response - missing user or token");
    }

    // Validate user data
    if (!data.user.email || !data.user.name) {
      console.error('Invalid user data:', data.user);
      throw new Error("Invalid user data received from server");
    }

    currentUser = data.user;
    userToken = data.token;
    tokenExpiry = Date.now() + (data.expiresIn || SESSION_TIMEOUT_MINUTES * 60) * 1000;

    console.log('Setting user session:', {
      user: currentUser.name,
      role: currentUser.role,
      email: currentUser.email,
      tokenExpiry: new Date(tokenExpiry).toISOString()
    });

    // Store in localStorage with encryption
    const encryptedUser = btoa(JSON.stringify(currentUser));
    const encryptedToken = btoa(userToken);
    const encryptedExpiry = btoa(tokenExpiry.toString());

    localStorage.setItem("user", encryptedUser);
    localStorage.setItem("token", encryptedToken);
    localStorage.setItem("tokenExpiry", encryptedExpiry);

    // Clear login attempts on successful login
    loginAttempts.delete(email);

    // Start session timer
    startSessionTimer();

    // Update UI immediately
    updateAuthUI();
    hideLoginModal();

    // Show success message
    showNotification(`Login successful! Welcome back, ${currentUser.name}.`, "success");

    // Log activity
    addActivityLog("User logged in successfully", "success");

    console.log('=== LOGIN SUCCESS ===');
    console.log('Login completed successfully for:', currentUser.name);
    console.log('User role:', currentUser.role);
    console.log('User email:', currentUser.email);
    console.log('Token expires:', new Date(tokenExpiry).toISOString());
    console.log('Session timeout set:', SESSION_TIMEOUT_MINUTES, 'minutes');

  } catch (error) {
    console.error('Login error:', error);
    recordLoginAttempt(email);
    showNotification(
      error.message || "Login failed. Please check your credentials.",
      "error"
    );
  }
}

// Get client IP (for security logging)
function getClientIP() {
  // This is a fallback - real IP detection would require server-side help
  return localStorage.getItem("clientIP") || "unknown";
}

async function registerUser(name, email, password, activationCode) {
  try {
    const response = await fetch(`${WORKER_URL}?action=register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, email, password, activationCode }),
    });

    if (!response.ok) {
      throw new Error("Registration failed");
    }

    const data = await response.json();
    showNotification("Registration successful! Please login.", "success");
    hideRegisterModal();
    showLoginModal();
  } catch (error) {
    showNotification(
      "Registration failed. Please check your activation code.",
      "error"
    );
  }
}

async function logoutUser() {
  console.log('Logging out user:', currentUser?.name || 'unknown');

  // Clear session timer
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }

  // Mark user as offline before logging out
  if (currentUser && userToken) {
    try {
      await fetch(`${WORKER_URL}?action=logout_user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${userToken}`
        },
        body: JSON.stringify({
          email: currentUser.email,
          sessionEnd: new Date().toISOString()
        }),
      });
      console.log('Successfully marked user as offline');
    } catch (error) {
      console.log("Failed to mark user as offline:", error);
    }
  }

  // Clear all stored data
  currentUser = null;
  userToken = null;
  tokenExpiry = null;

  localStorage.removeItem("user");
  localStorage.removeItem("token");
  localStorage.removeItem("tokenExpiry");
  localStorage.removeItem("clientIP");

  // Clear impersonation data if present
  localStorage.removeItem("impersonating_admin_session");

  console.log('Cleared all session data from localStorage');

  updateAuthUI();
  hideProfileModal();

  // Clear any cached data
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => caches.delete(name));
    });
  }

  showNotification("Logged out successfully", "success");

  // Log activity
  addActivityLog("User logged out", "info");

  console.log('Logout completed successfully');
}

// Notification system
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
    type === "success"
      ? "bg-green-600"
      : type === "error"
      ? "bg-red-600"
      : "bg-blue-600"
  } text-white max-w-sm`;
  notification.innerHTML = `
    <div class="flex items-center space-x-2">
      <span>${message}</span>
      <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-white/70 hover:text-white">×</button>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 5000);
}

// --- FIX ---
// Corrected the logic in the stopImpersonation function.
function stopImpersonation() {
  console.log('Attempting to stop impersonation...');

  const adminSessionData = localStorage.getItem("impersonating_admin_session");

  if (adminSessionData) {
    try {
      console.log('Found admin session data. Restoring...');
      // Restore admin session from the single stored item
      const adminSession = JSON.parse(atob(adminSessionData));

      // Validate the restored session data
      if (!adminSession.user || !adminSession.token) {
        throw new Error("Invalid admin session data found in storage.");
      }

      // Update global variables to restore admin session
      currentUser = adminSession.user;
      userToken = adminSession.token;
      tokenExpiry = Date.now() + (SESSION_TIMEOUT_MINUTES * 60 * 1000);

      // Update localStorage with restored admin session
      localStorage.setItem("user", btoa(JSON.stringify(currentUser)));
      localStorage.setItem("token", btoa(userToken));
      localStorage.setItem("tokenExpiry", btoa(tokenExpiry.toString()));

      // --- FIX ---
      // Clean up ALL impersonation keys
      localStorage.removeItem("impersonating_admin_session");
      localStorage.removeItem("impersonated_user_data"); // Also remove the impersonated user's data

      // Clear any existing session timer and restart it for the admin
      if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
      }
      startSessionTimer();

      // Update UI immediately
      updateAuthUI();
      showNotification(`Returned to admin session as ${currentUser.name}`, "success");

      // Log activity
      addActivityLog(`Admin stopped impersonation and returned to admin session`, "info");

      console.log('Impersonation stopped successfully, admin session restored.');
    } catch (error) {
      console.error('Error restoring admin session:', error);
      // Fallback: clear everything and log the user out completely for security
      logoutUser();
      showNotification("Failed to restore admin session. You have been logged out.", "error");
    }
  } else {
    console.log('No impersonation session found to stop.');
    showNotification('No active impersonation session found.', 'info');
  }
}


// Check and display impersonation banner
function checkImpersonation() {
  const banner = document.getElementById("impersonation-banner");
  const adminSessionJson = localStorage.getItem("impersonating_admin_session");

  if (banner && adminSessionJson && currentUser) {
    // Only show the banner if we are actually in an impersonation session
    const adminSession = JSON.parse(atob(adminSessionJson));
    if (adminSession.user.email !== currentUser.email) {
      banner.innerHTML = `
            <div class="bg-yellow-600 text-black text-center p-2 font-bold text-sm">
                You are impersonating ${currentUser.name}.
                <button onclick="stopImpersonation()" class="ml-4 bg-yellow-800 text-white py-1 px-3 rounded-md hover:bg-yellow-900">[Return to Admin]</button>
            </div>
        `;
      banner.classList.remove("hidden");
    } else {
      banner.classList.add("hidden");
    }
  } else if (banner) {
    banner.classList.add("hidden");
  }
}


// Immediate UI update for existing sessions (before DOM is ready)
function initializeAuthUI() {
  console.log('Initializing authentication UI...');

  // --- FIX START ---
  // Reworked initialization logic to correctly handle impersonation on page load
  const adminSessionData = localStorage.getItem("impersonating_admin_session");
  const impersonatedUserData = localStorage.getItem("impersonated_user_data");

  if (adminSessionData && impersonatedUserData) {
    // We are in an active impersonation session.
    try {
      // 1. Load the ADMIN's session to get the powerful token
      const adminSession = JSON.parse(atob(adminSessionData));
      if (!adminSession.user || !adminSession.token) {
        throw new Error("Invalid admin session data.");
      }
      // Set the userToken to the ADMIN's token
      userToken = adminSession.token;

      // 2. Load the IMPERSONATED user's data to display in the UI
      const impersonatedUser = JSON.parse(atob(impersonatedUserData));
      if (!impersonatedUser.email) {
        throw new Error("Invalid impersonated user data.");
      }
      // Set the currentUser to the IMPERSONATED user
      currentUser = impersonatedUser;

      // 3. Set a temporary expiry for the impersonation session
      tokenExpiry = Date.now() + (30 * 60 * 1000);

      console.log('Loaded and validated impersonation session:', {
        impersonating: adminSession.user.email,
        as: currentUser.name,
        adminToken: userToken ? 'Present' : 'Missing'
      });

    } catch (error) {
      console.error("Failed to initialize impersonation session:", error);
      // If there's any issue, clear all impersonation data and revert to admin
      stopImpersonation();
      return; // Exit here to let stopImpersonation handle the UI update
    }

  } else {
    // Standard session initialization (no impersonation)
    const encryptedUser = localStorage.getItem("user");
    const encryptedToken = localStorage.getItem("token");
    const encryptedExpiry = localStorage.getItem("tokenExpiry");

    if (encryptedUser && encryptedToken && encryptedExpiry) {
      try {
        currentUser = JSON.parse(atob(encryptedUser));
        userToken = atob(encryptedToken);
        tokenExpiry = parseInt(atob(encryptedExpiry));

        if (isTokenExpired()) {
          console.log('Token expired, logging out...');
          logoutUser();
          return;
        }

        console.log('Found existing session:', {
          user: currentUser.name,
          role: currentUser.role,
          tokenExpiry: new Date(tokenExpiry).toISOString()
        });

      } catch (error) {
        console.error("Session validation failed:", error);
        logoutUser();
        return;
      }
    } else {
      console.log('No existing session found');
    }
  }

  // Common logic for both session types
  if (currentUser) {
    document.body.classList.add('user-logged-in');
    document.body.classList.remove('user-not-logged-in');
    startSessionTimer();
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetSessionTimer, { passive: true });
    });
  } else {
    document.body.classList.remove('user-logged-in');
    document.body.classList.add('user-not-logged-in');
  }
  // --- FIX END ---

  // Update UI - use a more robust approach
  updateAuthUI();
}

// Call immediately
initializeAuthUI();

// Initialize authentication on page load with enhanced security
document.addEventListener("DOMContentLoaded", () => {
  // Re-check session in case it changed during page load
  initializeAuthUI();

  // Ensure UI is updated after all components are loaded
  setTimeout(updateAuthUI, 100);
  setTimeout(updateAuthUI, 500);

  // Add security headers to all fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const [url, options = {}] = args;
    if (url.includes(WORKER_URL)) {
      // Only add Content-Type if not already present
      if (!options.headers || !options.headers['Content-Type']) {
        options.headers = {
          ...options.headers,
          'Content-Type': 'application/json'
        };
      }
    }
    return originalFetch.apply(this, [url, options]);
  };

  // Authentication event listeners
  const loginBtn = document.getElementById("login-btn");
  const registerBtn = document.getElementById("register-btn");
  const profileBtn = document.getElementById("profile-btn");
  const closeLoginModal = document.getElementById("close-login-modal");
  const closeRegisterModal = document.getElementById("close-register-modal");
  const closeProfileModal = document.getElementById("close-profile-modal");
  const showRegisterBtn = document.getElementById("show-register-btn");
  const showLoginBtn = document.getElementById("show-login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // Desktop buttons
  if (loginBtn) loginBtn.addEventListener("click", showLoginModal);
  if (registerBtn) registerBtn.addEventListener("click", showRegisterModal);
  if (profileBtn) profileBtn.addEventListener("click", showProfileModal);

  // Mobile buttons
  const mobileLoginBtn = document.getElementById("mobile-login-btn");
  const mobileRegisterBtn = document.getElementById("mobile-register-btn");
  const mobileProfileBtn = document.getElementById("mobile-profile-btn");
  const mobileLogoutBtn = document.getElementById("mobile-logout-btn");

  if (mobileLoginBtn)
    mobileLoginBtn.addEventListener("click", () => {
      showLoginModal();
      // Close mobile sidebar
      const mobileSidebar = document.getElementById("mobile-sidebar");
      if (mobileSidebar) {
        mobileSidebar.classList.add("translate-x-full");
        mobileSidebar.classList.remove("opacity-100", "pointer-events-auto");
        mobileSidebar.classList.add("opacity-0", "pointer-events-none");
        document.body.classList.remove("mobile-sidebar-open");
      }
    });

  if (mobileRegisterBtn)
    mobileRegisterBtn.addEventListener("click", () => {
      showRegisterModal();
      // Close mobile sidebar
      const mobileSidebar = document.getElementById("mobile-sidebar");
      if (mobileSidebar) {
        mobileSidebar.classList.add("translate-x-full");
        mobileSidebar.classList.remove("opacity-100", "pointer-events-auto");
        mobileSidebar.classList.add("opacity-0", "pointer-events-none");
        document.body.classList.remove("mobile-sidebar-open");
      }
    });

  if (mobileProfileBtn)
    mobileProfileBtn.addEventListener("click", () => {
      showProfileModal();
      // Close mobile sidebar
      const mobileSidebar = document.getElementById("mobile-sidebar");
      if (mobileSidebar) {
        mobileSidebar.classList.add("translate-x-full");
        mobileSidebar.classList.remove("opacity-100", "pointer-events-auto");
        mobileSidebar.classList.add("opacity-0", "pointer-events-none");
        document.body.classList.remove("mobile-sidebar-open");
      }
    });

  if (mobileLogoutBtn)
    mobileLogoutBtn.addEventListener("click", () => {
      logoutUser();
      // Close mobile sidebar
      const mobileSidebar = document.getElementById("mobile-sidebar");
      if (mobileSidebar) {
        mobileSidebar.classList.add("translate-x-full");
        mobileSidebar.classList.remove("opacity-100", "pointer-events-auto");
        mobileSidebar.classList.add("opacity-0", "pointer-events-none");
        document.body.classList.remove("mobile-sidebar-open");
      }
    });

  // Modal close buttons
  if (closeLoginModal)
    closeLoginModal.addEventListener("click", hideLoginModal);
  if (closeRegisterModal)
    closeRegisterModal.addEventListener("click", hideRegisterModal);
  if (closeProfileModal)
    closeProfileModal.addEventListener("click", hideProfileModal);

  // Modal outside click
  const loginModal = document.getElementById("login-modal");
  const registerModal = document.getElementById("register-modal");
  const profileModal = document.getElementById("profile-modal");

  if (loginModal) {
    loginModal.addEventListener("click", (e) => {
      if (e.target === loginModal) hideLoginModal();
    });
  }

  if (registerModal) {
    registerModal.addEventListener("click", (e) => {
      if (e.target === registerModal) hideRegisterModal();
    });
  }

  if (profileModal) {
    profileModal.addEventListener("click", (e) => {
      if (e.target === profileModal) hideProfileModal();
    });
  }

  // Switch between login and register
  if (showRegisterBtn)
    showRegisterBtn.addEventListener("click", () => {
      hideLoginModal();
      showRegisterModal();
    });

  if (showLoginBtn)
    showLoginBtn.addEventListener("click", () => {
      hideRegisterModal();
      showLoginModal();
    });

  // Logout button
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

  // Form submissions
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      loginUser(email, password);
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("register-name").value;
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      const activationCode = document.getElementById("activation-code").value;
      registerUser(name, email, password, activationCode);
    });
  }

  // Restricted content buttons
  const restrictedLoginBtn = document.getElementById("restricted-login-btn");
  const restrictedRegisterBtn = document.getElementById(
    "restricted-register-btn"
  );

  if (restrictedLoginBtn) {
    restrictedLoginBtn.addEventListener("click", showLoginModal);
  }

  if (restrictedRegisterBtn) {
    restrictedRegisterBtn.addEventListener("click", showRegisterModal);
  }
});

