export function mapAmplifyAuthError(err: unknown): string {
  if (!err || typeof err !== 'object') return 'An unexpected error occurred.';
  const e = err as { name?: unknown; code?: unknown; message?: unknown };
  const name: string =
    (typeof e.name === 'string' && e.name) || (typeof e.code === 'string' && e.code) || 'Error';
  const message: string = typeof e.message === 'string' ? e.message : '';
  switch (name) {
    case 'NotAuthorizedException':
      // incorrect username or password
      return 'Incorrect email or password.';
    case 'UserNotFoundException':
      return 'No account found with that email.';
    case 'UserNotConfirmedException':
      return 'Account not confirmed. Please check your email for the verification code.';
    case 'PasswordResetRequiredException':
      return 'Password reset required. Please reset your password.';
    case 'TooManyFailedAttemptsException':
      return 'Too many failed attempts. Please wait and try again.';
    case 'InvalidParameterException':
      if (message?.includes('Username cannot be of email format')) {
        return 'Sign-up username cannot be an email because the pool uses email as an alias. Please try again or contact support.';
      }
      return message || 'Invalid input. Please review the form and try again.';
    case 'InvalidPasswordException':
      return 'Password must be at least 8 characters, include a number, and include a symbol.';
    case 'LimitExceededException':
      return 'Attempt limit exceeded. Please try again later.';
    case 'CodeMismatchException':
      return 'Invalid verification code.';
    case 'ExpiredCodeException':
      return 'Verification code expired. Request a new one.';
    default:
      // If Amplify gives a useful message, surface it; else generic
      if (message && typeof message === 'string') {
        // Strip AWS internal formatting if present
        return message.replace(/^\[.*?\]\s*/, '').trim();
      }
      return 'An unexpected error occurred.';
  }
}
