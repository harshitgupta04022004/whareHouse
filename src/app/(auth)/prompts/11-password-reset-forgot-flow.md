# Prompt 11 — Password Reset / Forgot Password UI

## Role
Frontend engineer implementing the password reset flow for Supabase Auth.

## Problem Statement
database.md § Authentication mentions Supabase Auth with email/password. Users need a way to reset forgotten passwords.

### Screens Required
1. **Forgot Password** — email input form, submits to Supabase `resetPasswordForEmail()`
2. **Confirmation message** — "Check your email for a reset link"
3. **Reset Password** — new password + confirm password form (arrived via email link with `#access_token` hash)
4. **Success** — redirect to login with "Password reset successful" toast

### Validation
- Email: valid format, required
- New password: min 8 chars, at least 1 number, at least 1 letter
- Confirm password: must match
- Show/hide password toggle on both password fields

### Supabase Integration
```typescript
// Forgot Password
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
});

// Update Password (after clicking link)
const { error } = await supabase.auth.updateUser({ password: newPassword });
```

### Rate Limiting
database.md limits password reset to 5 attempts per hour. The frontend should:
- Show "Too many reset attempts. Try again in 1 hour." on 429
- Disable submit button for 60 seconds after each attempt (UX cooldown)
- Never reveal whether the email exists in the system (security)

### Error Messages
- "If an account exists with this email, you'll receive a reset link." (always same message, prevents email enumeration)
- "Invalid or expired reset link. Request a new one." (bad token)
- "Passwords do not match." (client-side)
- "Password must be at least 8 characters." (client-side)

## Visual Decisions
- Same industrial palette (charcoal/slate/mist/paper)
- Simple centered form, no hero section needed
- Clear success/error states with [MDN form validation](https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Constraint_validation)

## Connections
- Backend: Supabase Auth handles the token flow (no custom backend needed)
- Auth prompt `frontend/01` should link to "Forgot password?"
- Rate limit: `backend/09` limits reset attempts
- Audit: reset attempts logged as `login` action with metadata

## Acceptance Criteria
- [ ] Forgot password form works end-to-end
- [ ] Reset link arrives in email (test with real or mock Supabase)
- [ ] Password update works and user can login with new password
- [ ] Rate limit message shown after 5 attempts
- [ ] Email enumeration prevented (same message for valid/invalid email)
