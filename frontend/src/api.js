const apiBaseUrl = import.meta.env.VITE_API_URL || '';

export async function getCsrfToken() {
  const response = await fetch(`${apiBaseUrl}/api/auth/csrf`, {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('CSRF token could not be initialized.');
  }
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers);
  const csrfToken = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (csrfToken && !headers.has('X-XSRF-TOKEN')) {
    headers.set('X-XSRF-TOKEN', decodeURIComponent(csrfToken));
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}
