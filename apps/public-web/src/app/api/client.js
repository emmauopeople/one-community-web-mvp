import {getLanguage} from '../../i18n/store';
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(config => {config.headers['Accept-Language']=getLanguage();return config;});
