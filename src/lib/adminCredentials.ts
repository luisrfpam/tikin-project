const SESSION_KEY = 'tikin_admin_session';

export function setAdminSession(active: boolean) {
  if (active) {
    localStorage.setItem(SESSION_KEY, '1');
    return;
  }
  localStorage.removeItem(SESSION_KEY);
}

export function hasAdminSession() {
  return localStorage.getItem(SESSION_KEY) === '1';
}

export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}
