import axios from 'axios';

const TOKEN_KEY = 'tt_token';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A 401 on any authenticated request means the session is over: notify AuthContext.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const isAuthCall = error.config?.url?.startsWith('/auth/login') || error.config?.url?.startsWith('/auth/signup');
    if (error.response?.status === 401 && !isAuthCall) {
      tokenStorage.clear();
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

/** Turns an Axios error into a user-facing message (+ field errors when the API sent them). */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please try again.';
  if (error?.request && !error.response) return 'Cannot reach the server. Check that the API is running.';
  return fallback;
}

export const getFieldErrors = (error) => error?.response?.data?.errors || {};

export default api;
