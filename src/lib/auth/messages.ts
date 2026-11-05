/** Messages for /login?error=CODE. Only these fixed texts are ever shown; the URL value is never printed. */
export const LOGIN_ERRORS: Record<string, string> = {
  oauth_cancelled: "Sign-in was cancelled. You can try again whenever you're ready.",
  oauth_expired: "That sign-in attempt expired. Please try again.",
  oauth_failed: "We couldn't complete that sign-in. Please try again.",
  oauth_exists: "An account with this email already exists. Please log in with your email and password instead.",
  no_verified_email: "That account has no verified email address, so we can't sign you in with it. Verify your email with the provider, or sign up with email instead.",
  no_profile: "We couldn't load your account. Please contact support.",
  suspended: "This account has been suspended. Please contact support.",
};

export function loginErrorMessage(code: string | undefined) {
  return code && Object.hasOwn(LOGIN_ERRORS, code) ? LOGIN_ERRORS[code] : undefined;
}
