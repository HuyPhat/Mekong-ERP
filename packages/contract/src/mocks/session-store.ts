const SESSION_KEY = 'mekong-erp:session-user-id';

export function readActiveUserId(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeActiveUserId(userId: string | null): void {
  try {
    if (userId) {
      localStorage.setItem(SESSION_KEY, userId);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  } catch {
    // localStorage unavailable (private mode, etc.) — session just won't persist.
  }
}
