import axios from "axios";

const configuredApiUrl =
  process.env.REACT_APP_API_URL || "https://discord-modified-api.onrender.com";
const absoluteApiUrl = configuredApiUrl
  .trim()
  .match(/https?:\/\/[^\s\])]+/)?.[0]
  .replace(/\/+$/, "");

const instance = axios.create({
  baseURL: absoluteApiUrl || "https://discord-modified-api.onrender.com",
});

export default instance;
