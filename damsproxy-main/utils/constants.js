// Application Constants
const APP_CONFIG = {
  VERSION: '2.4.0',
  NAME: 'DAMS_VIEWER',
  WORKER_URL: 'https://compute.anyme.workers.dev',
  SESSION_TIMEOUT_MINUTES: 60,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  API_TIMEOUT: 30000, // 30 seconds
};

// UI Constants
const UI_CONFIG = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  COLORS: {
    PRIMARY: '#0d9488',
    SUCCESS: '#10b981',
    WARNING: '#f59e0b',
    ERROR: '#ef4444',
    INFO: '#3b82f6',
  },
  THEMES: {
    DARK: 'dark',
    LIGHT: 'light',
  },
};

// API Endpoints
const API_ENDPOINTS = {
  LOGIN: '?action=login',
  REGISTER: '?action=register',
  LOGOUT: '?action=logout_user',
  CATEGORIES: '?view=categories',
  COURSES: '?view=courses',
  SUBJECTS: '?view=subjects',
  TOPICS: '?view=topics',
  VIDEOS: '?view=videos',
  NOTES_AND_TESTS: '?view=course_notes_and_test_data',
  MY_PLANS: '?view=my_plan_courses',
  PLAN_DETAILS: '?view=plan_child_courses',
  USER_MANAGEMENT: '?action=get_users',
  CODE_MANAGEMENT: '?action=get_codes',
  GENERATE_CODES: '?action=generate_codes',
  DELETE_USER: '?action=delete_user',
  UPDATE_USER: '?action=update_user',
  EXTEND_ACCESS: '?action=extend_user_access',
  ANNOUNCEMENTS: '?action=get_announcements',
  CREATE_ANNOUNCEMENT: '?action=create_announcement',
  DELETE_ANNOUNCEMENT: '?action=delete_announcement',
  BUILD_INFO: '?action=get_build',
  IMPERSONATE: '?action=impersonate',
  DELETE_CODE: '?action=delete_activation_code',
};

// Error Messages
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network connection failed. Please check your internet connection.',
  API_ERROR: 'Server communication error. Please try again later.',
  AUTH_ERROR: 'Authentication failed. Please login again.',
  PERMISSION_ERROR: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
  FILE_NOT_FOUND: 'The requested content was not found.',
  DOWNLOAD_ERROR: 'Failed to generate download links.',
  INVALID_FILE: 'Invalid file format or corrupted file.',
};

// Success Messages
const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful! Welcome back.',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  REGISTRATION_SUCCESS: 'Registration successful! Please login.',
  CODE_GENERATED: 'Activation codes generated successfully!',
  USER_UPDATED: 'User information updated successfully.',
  ACCESS_EXTENDED: 'User access extended successfully.',
  ANNOUNCEMENT_CREATED: 'Announcement created successfully!',
  SETTINGS_SAVED: 'Settings saved successfully.',
  BACKUP_CREATED: 'System backup created successfully.',
  CACHE_CLEARED: 'System cache cleared successfully.',
};

// File Extensions
const FILE_EXTENSIONS = {
  VIDEO: ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'],
  AUDIO: ['.mp3', '.wav', '.aac', '.ogg', '.m4a'],
  DOCUMENT: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'],
  IMAGE: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  ARCHIVE: ['.zip', '.rar', '.7z', '.tar', '.gz'],
};

// MIME Types
const MIME_TYPES = {
  VIDEO: 'video/mp4',
  AUDIO: 'audio/mpeg',
  DOCUMENT: 'application/pdf',
  IMAGE: 'image/jpeg',
  TEXT: 'text/plain',
  JSON: 'application/json',
};

// Local Storage Keys
const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'token',
  TOKEN_EXPIRY: 'tokenExpiry',
  THEME: 'theme',
  LANGUAGE: 'language',
  RESUME_WATCHING: 'resume_watching',
  SEARCH_HISTORY: 'search_history',
  USER_PREFERENCES: 'user_preferences',
  CACHE_DATA: 'cache_data',
  CLIENT_IP: 'clientIP',
  SESSION_ID: 'sessionId',
};

// Event Types
const EVENT_TYPES = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  USER_REGISTER: 'user:register',
  CONTENT_VIEW: 'content:view',
  VIDEO_PLAY: 'video:play',
  DOWNLOAD_START: 'download:start',
  DOWNLOAD_COMPLETE: 'download:complete',
  ERROR_OCCURRED: 'error:occurred',
  THEME_CHANGE: 'theme:change',
  LANGUAGE_CHANGE: 'language:change',
};

// Navigation States
const NAVIGATION_STATES = {
  CATEGORIES: 'categories',
  COURSES: 'courses',
  SUBJECTS: 'subjects',
  TOPICS: 'topics',
  VIDEOS: 'videos',
  PLAN_DETAILS: 'plan_details',
};

// User Roles
const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPREME: 'supreme',
};

// Content Types
const CONTENT_TYPES = {
  VIDEO: 'video',
  DOCUMENT: 'document',
  TEST: 'test',
  Q_BANK: 'qbank',
  NOTES: 'notes',
  COURSE_TYPE_6: '6', // Topic-based courses
  COURSE_TYPE_3: '3', // QBank courses
  COURSE_TYPE_2: '2', // Test series courses
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Animation Classes
const ANIMATION_CLASSES = {
  FADE_IN: 'fade-in',
  SLIDE_UP: 'slide-up',
  SLIDE_DOWN: 'slide-down',
  BOUNCE: 'bounce',
  PULSE: 'pulse',
  SPIN: 'spin',
  SHAKE: 'shake',
};

// CSS Classes
const CSS_CLASSES = {
  HIDDEN: 'hidden',
  VISIBLE: 'visible',
  ACTIVE: 'active',
  DISABLED: 'disabled',
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
};

// Export all constants
window.APP_CONFIG = APP_CONFIG;
window.UI_CONFIG = UI_CONFIG;
window.API_ENDPOINTS = API_ENDPOINTS;
window.ERROR_MESSAGES = ERROR_MESSAGES;
window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;
window.FILE_EXTENSIONS = FILE_EXTENSIONS;
window.MIME_TYPES = MIME_TYPES;
window.STORAGE_KEYS = STORAGE_KEYS;
window.EVENT_TYPES = EVENT_TYPES;
window.NAVIGATION_STATES = NAVIGATION_STATES;
window.USER_ROLES = USER_ROLES;
window.CONTENT_TYPES = CONTENT_TYPES;
window.HTTP_STATUS = HTTP_STATUS;
window.ANIMATION_CLASSES = ANIMATION_CLASSES;
window.CSS_CLASSES = CSS_CLASSES;