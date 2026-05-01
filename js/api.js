// api.js — all API calls in one place
const API = (() => {
  function getSessionId() {
    let id = localStorage.getItem("sku_session_id");
    if (!id) {
      id = "sess_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("sku_session_id", id);
    }
    return id;
  }

  async function request(method, path, body = null) {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-session-id": getSessionId()
      }
    };
    if (body) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(CONFIG.API_URL + path, opts);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    } catch (err) {
      console.error("API error:", err);
      throw err;
    }
  }

  return {
    sessionId: getSessionId,
    // SKUs
    getSkus: (params = {}) => {
      const q = new URLSearchParams(params).toString();
      return request("GET", `/api/skus${q ? "?" + q : ""}`);
    },
    saveSku: (data) => request("POST", "/api/skus", data),
    saveBulk: (skus) => request("POST", "/api/skus/bulk", { skus }),
    deleteSku: (id) => request("DELETE", `/api/skus/${id}`),
    clearSkus: () => request("DELETE", "/api/skus"),
    // Templates
    getTemplates: () => request("GET", "/api/templates"),
    saveTemplate: (data) => request("POST", "/api/templates", data),
    deleteTemplate: (id) => request("DELETE", `/api/templates/${id}`),
    // Stats
    getStats: () => request("GET", "/api/stats"),
  };
})();
