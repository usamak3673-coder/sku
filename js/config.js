// config.js — update API_URL after deploying backend to Render
const CONFIG = {
  // Replace with your Render URL after deployment
  // e.g. "https://sku-workshop-api.onrender.com"
  API_URL: "https://sku-backend-d205.onrender.com",

  // For local development, use: "http://localhost:4000"
  // API_URL: "http://localhost:4000",
};

// Auto-detect local dev
if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
  CONFIG.API_URL = "http://localhost:4000";
}
