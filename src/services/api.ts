import axios from "axios";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:3000`;
  }
  return "http://localhost:3000";
};

export const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  // headers: {
  //   "Content-Type": "application/json", // for set the content type as multi-part form data      
  // },
});

api.interceptors.request.use((config) => {
  const credential = localStorage.getItem("credential");
  if (credential) {
    config.headers.Authorization = `Bearer ${credential}`;
  }
  return config;
});

export default api;
