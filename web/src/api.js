const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const TOKEN_KEY = 'solar_auth_token';
const USER_KEY = 'solar_auth_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE_URL}${endpoint}`;
  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err) {
    throw new Error('Network error. Check server connection.');
  }

  if (response.status === 401) {
    clearSession();
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }
  return data;
}

export const api = {
  login: async (identifier, password) => {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    setSession(res.token, res.user);
    return res;
  },
  getMe: () => request('/me'),
  getPlants: () => request('/plants'),
  getPlantLive: (plantId) => request(`/plants/${plantId}/live`),
  getPlantHistory: (plantId, range, date) => request(`/plants/${plantId}/history?range=${range}&date=${date}`),
  createPlant: (data) => request('/plants', { method: 'POST', body: JSON.stringify(data) }),
  updatePlant: (plantId, data) => request(`/plants/${plantId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePlant: (plantId) => request(`/plants/${plantId}`, { method: 'DELETE' }),
  testCollector: (plantId) => request(`/plants/${plantId}/test-collector`, { method: 'POST' }),
  getAlerts: (unseenOnly = false) => request(`/alerts?unseenOnly=${unseenOnly}`),
  markAlertSeen: (alertId) => request(`/alerts/${alertId}/seen`, { method: 'POST' }),
  markAllAlertsSeen: () => request('/alerts/mark-all-seen', { method: 'POST' }),
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  deleteUser: (userId) => request(`/users/${userId}`, { method: 'DELETE' }),
  setUserPlants: (userId, plantIds) => request(`/users/${userId}/plants`, { method: 'PUT', body: JSON.stringify({ plantIds }) }),
  logout: () => { clearSession(); window.location.href = '/login'; }
};

export default api;
