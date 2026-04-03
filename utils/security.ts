/**
 * Security Utilities for FX Journal Application
 * Implements rate limiting, password validation, account lockout, and session management
 */

// ============================================================================
// 1. RATE LIMITING
// ============================================================================

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
const MAX_ATTEMPTS = 5;

export function checkRateLimit(key: string): { allowed: boolean; remainingTime?: number } {
  const storageKey = `rate_limit_${key}`;
  const stored = localStorage.getItem(storageKey);
  const now = Date.now();

  if (!stored) {
    // First attempt
    const entry: RateLimitEntry = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
    localStorage.setItem(storageKey, JSON.stringify(entry));
    return { allowed: true };
  }

  const entry: RateLimitEntry = JSON.parse(stored);

  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    // Reset counter
    const newEntry: RateLimitEntry = {
      attempts: 1,
      firstAttempt: now,
      lastAttempt: now,
    };
    localStorage.setItem(storageKey, JSON.stringify(newEntry));
    return { allowed: true };
  }

  // Check if max attempts exceeded
  if (entry.attempts >= MAX_ATTEMPTS) {
    const remainingTime = RATE_LIMIT_WINDOW - (now - entry.firstAttempt);
    return { allowed: false, remainingTime };
  }

  // Increment attempts
  entry.attempts += 1;
  entry.lastAttempt = now;
  localStorage.setItem(storageKey, JSON.stringify(entry));

  return { allowed: true };
}

export function resetRateLimit(key: string): void {
  const storageKey = `rate_limit_${key}`;
  localStorage.removeItem(storageKey);
}

export function formatRemainingTime(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

// ============================================================================
// 2. PASSWORD VALIDATION
// ============================================================================

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  suggestions: string[];
}

const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'welcome', 'jesus', 'ninja', 'mustang'
];

export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
  strength: PasswordStrength;
} {
  const errors: string[] = [];

  // Minimum length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Maximum length check (prevent DoS)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Special character check
  // eslint-disable-next-line no-useless-escape
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  }

  // Common password check
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a stronger password');
  }

  // Sequential characters check
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters (e.g., "aaa", "111")');
  }

  const strength = calculatePasswordStrength(password);

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const suggestions: string[] = [];

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character variety scoring
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  // eslint-disable-next-line no-useless-escape
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;

  // Penalty for common patterns
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) score = Math.max(0, score - 2);
  if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1);
  if (/^[0-9]+$/.test(password)) score = Math.max(0, score - 2);

  // Normalize score to 0-4
  score = Math.min(4, Math.max(0, Math.floor(score / 2)));

  // Generate suggestions
  if (password.length < 12) suggestions.push('Use at least 12 characters for better security');
  // eslint-disable-next-line no-useless-escape
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    suggestions.push('Add special characters for stronger password');
  }
  if (!/[0-9]/.test(password)) suggestions.push('Include numbers');
  if (!/[A-Z]/.test(password)) suggestions.push('Include uppercase letters');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

  return {
    score,
    label: labels[score],
    color: colors[score],
    suggestions,
  };
}

// ============================================================================
// 3. ACCOUNT LOCKOUT
// ============================================================================

interface LockoutEntry {
  failedAttempts: number;
  lockedUntil: number | null;
  lastFailedAttempt: number;
}

const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const MAX_FAILED_ATTEMPTS = 5;

export function checkAccountLockout(email: string): {
  locked: boolean;
  remainingTime?: number;
  attemptsRemaining?: number;
} {
  const storageKey = `lockout_${email}`;
  const stored = localStorage.getItem(storageKey);
  const now = Date.now();

  if (!stored) {
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
  }

  const entry: LockoutEntry = JSON.parse(stored);

  // Check if account is currently locked
  if (entry.lockedUntil && now < entry.lockedUntil) {
    const remainingTime = entry.lockedUntil - now;
    return { locked: true, remainingTime };
  }

  // Lockout expired, reset
  if (entry.lockedUntil && now >= entry.lockedUntil) {
    localStorage.removeItem(storageKey);
    return { locked: false, attemptsRemaining: MAX_FAILED_ATTEMPTS };
  }

  const attemptsRemaining = MAX_FAILED_ATTEMPTS - entry.failedAttempts;
  return { locked: false, attemptsRemaining: Math.max(0, attemptsRemaining) };
}

export function recordFailedLogin(email: string): void {
  const storageKey = `lockout_${email}`;
  const stored = localStorage.getItem(storageKey);
  const now = Date.now();

  let entry: LockoutEntry;

  if (!stored) {
    entry = {
      failedAttempts: 1,
      lockedUntil: null,
      lastFailedAttempt: now,
    };
  } else {
    entry = JSON.parse(stored);
    entry.failedAttempts += 1;
    entry.lastFailedAttempt = now;

    // Lock account if max attempts reached
    if (entry.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_DURATION;
    }
  }

  localStorage.setItem(storageKey, JSON.stringify(entry));
}

export function resetAccountLockout(email: string): void {
  const storageKey = `lockout_${email}`;
  localStorage.removeItem(storageKey);
}

// ============================================================================
// 4. SESSION TIMEOUT
// ============================================================================

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // 2 minutes

let lastActivityTime = Date.now();
let sessionTimeoutId: NodeJS.Timeout | null = null;
let warningTimeoutId: NodeJS.Timeout | null = null;
let onWarningCallback: (() => void) | null = null;
let onTimeoutCallback: (() => void) | null = null;

export function initSessionTimeout(
  onWarning: () => void,
  onTimeout: () => void
): void {
  onWarningCallback = onWarning;
  onTimeoutCallback = onTimeout;
  
  updateLastActivity();
  setupActivityListeners();
  resetSessionTimer();
}

export function updateLastActivity(): void {
  lastActivityTime = Date.now();
  resetSessionTimer();
}

export function extendSession(): void {
  updateLastActivity();
}

export function clearSessionTimeout(): void {
  if (sessionTimeoutId) {
    clearTimeout(sessionTimeoutId);
    sessionTimeoutId = null;
  }
  if (warningTimeoutId) {
    clearTimeout(warningTimeoutId);
    warningTimeoutId = null;
  }
  removeActivityListeners();
}

function resetSessionTimer(): void {
  // Clear existing timers
  if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
  if (warningTimeoutId) clearTimeout(warningTimeoutId);

  // Set warning timer
  warningTimeoutId = setTimeout(() => {
    if (onWarningCallback) onWarningCallback();
  }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT);

  // Set timeout timer
  sessionTimeoutId = setTimeout(() => {
    if (onTimeoutCallback) onTimeoutCallback();
  }, SESSION_TIMEOUT);
}

function setupActivityListeners(): void {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach(event => {
    document.addEventListener(event, updateLastActivity, { passive: true });
  });
}

function removeActivityListeners(): void {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  events.forEach(event => {
    document.removeEventListener(event, updateLastActivity);
  });
}

export function getRemainingSessionTime(): number {
  const elapsed = Date.now() - lastActivityTime;
  return Math.max(0, SESSION_TIMEOUT - elapsed);
}

// ============================================================================
// 5. INPUT SANITIZATION
// ============================================================================

export function sanitizeInput(input: string): string {
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Remove any script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

export function sanitizeEmail(email: string): string {
  // Basic email sanitization
  return email.toLowerCase().trim();
}

// ============================================================================
// 6. CAPTCHA HELPERS
// ============================================================================

export interface CaptchaConfig {
  siteKey: string;
  enabled: boolean;
}

let captchaConfig: CaptchaConfig = {
  siteKey: '',
  enabled: false,
};

export function initCaptcha(config: CaptchaConfig): void {
  captchaConfig = config;
}

export function isCaptchaEnabled(): boolean {
  return captchaConfig.enabled && !!captchaConfig.siteKey;
}

export function getCaptchaSiteKey(): string {
  return captchaConfig.siteKey;
}

// ============================================================================
// 7. SECURITY AUDIT LOGGING
// ============================================================================

export interface SecurityEvent {
  type: 'login_attempt' | 'login_success' | 'login_failure' | 'signup_attempt' | 'signup_success' | 'account_locked' | 'rate_limited' | 'session_timeout';
  email?: string;
  timestamp: number;
  details?: string;
}

export function logSecurityEvent(event: SecurityEvent): void {
  const logs = getSecurityLogs();
  logs.push(event);
  
  // Keep only last 100 events
  if (logs.length > 100) {
    logs.shift();
  }
  
  localStorage.setItem('security_logs', JSON.stringify(logs));
  
  // Also log to console in development
  if (import.meta.env.DEV) {
    console.log('🔒 Security Event:', event);
  }
}

export function getSecurityLogs(): SecurityEvent[] {
  const stored = localStorage.getItem('security_logs');
  return stored ? JSON.parse(stored) : [];
}

export function clearSecurityLogs(): void {
  localStorage.removeItem('security_logs');
}