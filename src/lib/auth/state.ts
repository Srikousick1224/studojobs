/** Shape returned by every auth Server Action to its form. */
export interface AuthState {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Email the action was about (so the UI can offer "resend" without re-typing). */
  email?: string;
  /** Set when login failed only because the email is not verified yet. */
  needsVerification?: boolean;
}

export const initialAuthState: AuthState = { status: "idle" };
