import axios from "axios";
import { auth } from "./firebase";

const configuredApiUrl =
  process.env.REACT_APP_API_URL || "https://discord-modified-api.onrender.com";
const absoluteApiUrl = configuredApiUrl
  .trim()
  .match(/https?:\/\/[^\s\])]+/)?.[0]
  .replace(/\/+$/, "");

const instance = axios.create({
  baseURL: absoluteApiUrl || "https://discord-modified-api.onrender.com",
});

instance.interceptors.request.use(async (config) => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default instance;
