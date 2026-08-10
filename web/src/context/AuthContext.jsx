import { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (!storedToken) {
        if (!cancelled) {
          setToken(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (cancelled) return;
        const me = res.data?.data || res.data;
        setToken(storedToken);
        setUser(me);
        localStorage.setItem('user', JSON.stringify(me));
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          logout();
        } else if (storedUser) {
          // Server unreachable — keep cached session for offline UX
          try {
            setUser(JSON.parse(storedUser));
            setToken(storedToken);
          } catch {
            logout();
          }
        } else {
          logout();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [logout]);

  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        const url = error.config?.url || '';
        const isAuthRoute = url.includes('/auth/login') || url.includes('/auth/register');
        if (error.response?.status === 401 && !isAuthRoute) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, [logout]);

  const registerUser = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      const { token: newToken, ...userInfo } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userInfo));

      setToken(newToken);
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Registration failed. Please try again.',
      };
    }
  };

  const loginUser = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: newToken, ...userInfo } = response.data;

      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userInfo));

      setToken(newToken);
      setUser(userInfo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Login failed. Please check your credentials.',
      };
    }
  };

  const updateUser = (updatedUserInfo) => {
    setUser(updatedUserInfo);
    localStorage.setItem('user', JSON.stringify(updatedUserInfo));
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, registerUser, loginUser, logout, updateUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
