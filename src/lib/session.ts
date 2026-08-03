// The closest thing AfterShot has to a session.
//
// There is no auth: /u/<token> and /studio?t=<token> are guarded by the secrecy
// of the upload token itself. All this does is remember that token in the
// browser that completed onboarding, so the nav and /account can find their way
// back without the owner having to keep the original link handy.

const KEY = 'aftershot_token';
const NAME_KEY = 'aftershot_business';

export function saveToken(token: string, businessName?: string) {
  try {
    localStorage.setItem(KEY, token);
    if (businessName) localStorage.setItem(NAME_KEY, businessName);
  } catch {
    // Private mode / storage disabled — the app still works via the link itself.
  }
}

export function loadToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function loadBusinessName(): string | null {
  try {
    return localStorage.getItem(NAME_KEY);
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(NAME_KEY);
  } catch {
    /* nothing to clear */
  }
}
