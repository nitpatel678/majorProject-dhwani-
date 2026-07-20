import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your backend URL
// For local dev with Expo: use your machine's LAN IP (not localhost)
const BASE_URL = 'http://192.168.1.100:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('dhwaniai_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['dhwaniai_token', 'dhwaniai_user']);
    }
    return Promise.reject(error);
  }
);

export default api;
export { BASE_URL };
