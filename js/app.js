// app.js — main application controller
const App = (() => {
  // State
  let state = {
    skus: [],
    stats: { total: 0, categoriesUsed: 0, todayCount: 0 },
    templates: { builtin: [], custom: [] },
    bulkResults: [],
    activeTab: "builder",
    filters: { category: "", format: "" },
    loading: false,
    apiOnline: true
  };

  // DOM helpers
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  // Toast
  function toast(msg, type = "info") {
    const el = $("toast");
    el.textContent = msg;
    el.className = "toast show " + type;
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove("show"), 2800);
  }

  // Stats
  async function loadStats() {
    try {
      const data = await API.getStats();
      state.stats = { total: data.total, categoriesUsed: data.categoriesUsed, todayCount: data.todayCount };
    } catch {
      // fallback: count from local state
      state.stats.total = state.skus.length;
    }
    renderStats();
  }

  function renderStats() {
    $("st-total").textContent = state.stats.total;
    $("st-cats").textContent = state.stats.categoriesUsed;
    $("st-today").textContent = state.stats.todayCount;
  }

  // Builder
  function updatePreview() {
    const cat = $("b-cat").value;
    const name = $("b-name").value;
    const code = $("b-code").value;
    const size = $("b-size").value;
    const mat = $("b-mat").value;
    const suf = $("b-suf").value;
    const fmt = $("b-fmt").value;

    if (!cat || !name.trim()) {
      $("preview-sku").textContent = "—";
      $("preview-sku").classList.remove("valid");
      return;
    }
    const sku = SKUEngine.build(cat, name, code, size, mat, suf, fmt);
    $("preview-sku").textContent = sku;
    const { valid } = SKUEngine.validate(sku);
    $("preview-sku").classList.toggle("valid", valid);
    // char count
    $("sku-length").textContent = sku.length + " chars";
  }

  async function saveSku() {
    const cat = $("b-cat").value;
    const name = $("b-name").value.trim();
    const code = $("b-code").value.trim();
    const size = $("b-size").value.trim();
    const mat = $("b-mat").value.trim();
    const suf = $("b-suf").value.trim();
    const fmt = $("b-fmt").value;
    const sku = $("preview-sku").textContent;

    const { valid, msg } = SKUEngine.validate(sku);
    if (!valid) { toast(msg, "error"); return; }

    setSaveLoading(true);
    try {
      const saved = await API.saveSku({
        sku, productName: name, categoryCode: cat,
        format: fmt,
        attributes: { code, size, material: mat, suffix: suf }
      });
      state.skus.unshift(saved);
      await loadStats();
      renderHistory();
      toast("SKU saved!", "success");
    } catch (err) {
      if (err.message.includes("Duplicate")) toast("This SKU already exists in your history", "error");
      else toast("Save failed: " + err.message, "error");
    }
    setSaveLoading(false);
  }

  function setSaveLoading(on) {
    const btn = $("save-btn");
    btn.disabled = on;
    btn.textContent = on ? "Saving…" : "Save to history";
  }

  function copySku() {
    const sku = $("preview-sku").textContent;
    if (sku === "—") return;
    navigator.clipboard.writeText(sku).then(() => toast("Copied: " + sku));
  }

  // Bulk
  async function runBulk() {
    const cat = $("bulk-cat").value;
    const fmt = $("bulk-fmt").value;
    const seq = $("bulk-seq").value === "yes";
    const lines = $("bulk-input").value.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) { toast("Enter at least one product name", "error"); return; }

    state.bulkResults = lines.map((name, i) => ({
      sku: SKUEngine.build(cat, name, seq ? String(i + 1).padStart(3, "0") : "", "", "", "", fmt),
      productName: name,
      categoryCode: cat,
      category: SKUEngine.CATEGORIES[cat] || cat,
      format: fmt
    }));

    const container = $("bulk-results");
    container.innerHTML = state.bulkResults.map(r => `
      <div class="bulk-row">
        <span class="bulk-name">${r.productName}</span>
        <span class="bulk-sku">${r.sku}</span>
        <button class="icon-btn" onclick="navigator.clipboard.writeText('${r.sku}').then(()=>App.toast('Copied'))">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
      </div>`).join("");
    $("bulk-actions").style.display = "flex";
  }

  async function bulkSaveAll() {
    if (!state.bulkResults.length) return;
    try {
      const result = await API.saveBulk(state.bulkResults);
      toast(result.saved + " SKUs saved!", "success");
      await loadStats();
      await loadHistory();
    } catch (err) {
      toast("Bulk save error: " + err.message, "error");
    }
  }

  function exportBulkCSV() {
    if (!state.bulkResults.length) return;
    const now = new Date();
    const fakeSkus = state.bulkResults.map(r => ({ ...r, createdAt: now }));
    SKUEngine.downloadCSV(SKUEngine.toCSV(fakeSkus), "bulk-skus.csv");
    toast("CSV downloaded");
  }

  // History
  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const params = {};
      if (state.filters.category) params.category = state.filters.category;
      if (state.filters.format) params.format = state.filters.format;
      const data = await API.getSkus(params);
      state.skus = data.skus;
      renderHistory();
    } catch {
      toast("Could not load history", "error");
    }
    setHistoryLoading(false);
  }

  function setHistoryLoading(on) {
    $("history-list").innerHTML = on ? '<div class="loading-row"><div class="spinner"></div> Loading…</div>' : "";
  }

  function renderHistory() {
    const el = $("history-list");
    if (!state.skus.length) {
      el.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>No SKUs yet. Build your first one!</p></div>';
      return;
    }
    el.innerHTML = state.skus.map(s => `
      <div class="history-item" id="item-${s._id}">
        <div class="history-main">
          <span class="history-sku">${s.sku}</span>
          <span class="history-meta">${s.productName} &middot; ${new Date(s.createdAt).toLocaleDateString()}</span>
        </div>
        <span class="cat-badge cat-${s.categoryCode}">${s.category}</span>
        <div class="item-actions">
          <button class="icon-btn" title="Copy" onclick="navigator.clipboard.writeText('${s.sku}').then(()=>App.toast('Copied'))">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="icon-btn danger" title="Delete" onclick="App.deleteSku('${s._id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
        </div>
      </div>`).join("");
  }

  async function deleteSku(id) {
    try {
      await API.deleteSku(id);
      state.skus = state.skus.filter(s => s._id !== id);
      const el = $("item-" + id);
      if (el) { el.style.opacity = "0"; el.style.transform = "translateX(20px)"; setTimeout(() => renderHistory(), 300); }
      await loadStats();
    } catch (err) {
      toast("Delete failed", "error");
    }
  }

  async function clearAll() {
    if (!confirm("Clear all SKUs? This cannot be undone.")) return;
    try {
      await API.clearSkus();
      state.skus = [];
      renderHistory();
      await loadStats();
      toast("History cleared");
    } catch {
      toast("Clear failed", "error");
    }
  }

  async function exportCSV() {
    if (!state.skus.length) { toast("No SKUs to export", "error"); return; }
    const data = await API.getSkus({ limit: 9999 });
    SKUEngine.downloadCSV(SKUEngine.toCSV(data.skus), "sku-history.csv");
    toast("CSV exported");
  }

  function applyFilters() {
    state.filters.category = $("h-cat").value;
    state.filters.format = $("h-fmt").value;
    loadHistory();
  }

  // Templates
  async function loadTemplates() {
    try {
      const data = await API.getTemplates();
      state.templates = data;
      renderTemplates();
    } catch {
      // Use fallback builtins
      renderTemplates();
    }
  }

  function renderTemplates() {
    const container = $("tmpl-list");
    const builtins = state.templates.builtin || [];
    const custom = state.templates.custom || [];

    let html = "";
    if (builtins.length) {
      html += '<div class="tmpl-section-label">Built-in templates</div>';
      html += builtins.map((t, i) => `
        <div class="tmpl-item" onclick="App.applyTemplate(${i}, 'builtin')">
          <div><div class="tmpl-name">${t.name}</div><div class="tmpl-example">${t.exampleSku}</div></div>
          <span class="tmpl-apply">Use →</span>
        </div>`).join("");
    }
    if (custom.length) {
      html += '<div class="tmpl-section-label" style="margin-top:1.5rem">Your templates</div>';
      html += custom.map(t => `
        <div class="tmpl-item">
          <div onclick="App.applyCustomTemplate('${t._id}')" style="flex:1;cursor:pointer">
            <div class="tmpl-name">${t.name}</div>
            <div class="tmpl-example">${t.exampleSku || "Custom"}</div>
          </div>
          <button class="icon-btn danger" onclick="App.deleteTemplate('${t._id}')">✕</button>
        </div>`).join("");
    }
    container.innerHTML = html || '<div class="empty-state"><p>No templates yet.</p></div>';
  }

  function applyTemplate(idx, type) {
    const t = (state.templates.builtin || [])[idx];
    if (!t) return;
    switchTab("builder");
    $("b-cat").value = t.categoryCode || "";
    $("b-fmt").value = t.format || "DASH";
    $("b-size").value = (t.defaults && t.defaults.size) || "";
    $("b-mat").value = (t.defaults && t.defaults.material) || "";
    $("b-code").value = (t.defaults && t.defaults.code) || "";
    $("b-suf").value = (t.defaults && t.defaults.suffix) || "";
    $("b-name").value = "";
    $("b-name").focus();
    updatePreview();
    toast("Template applied — add a product name");
  }

  async function deleteTemplate(id) {
    try {
      await API.deleteTemplate(id);
      await loadTemplates();
      toast("Template deleted");
    } catch { toast("Delete failed", "error"); }
  }

  // Save current builder settings as template
  async function saveAsTemplate() {
    const name = prompt("Template name:");
    if (!name) return;
    const cat = $("b-cat").value;
    if (!cat) { toast("Select a category first", "error"); return; }
    try {
      await API.saveTemplate({
        name,
        categoryCode: cat,
        category: SKUEngine.CATEGORIES[cat] || cat,
        format: $("b-fmt").value,
        defaults: {
          code: $("b-code").value,
          size: $("b-size").value,
          material: $("b-mat").value,
          suffix: $("b-suf").value
        },
        exampleSku: $("preview-sku").textContent
      });
      toast("Template saved!", "success");
      loadTemplates();
    } catch { toast("Save failed", "error"); }
  }

  // Tab switching
  function switchTab(id) {
    $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.tab === id));
    $$(".panel").forEach(p => p.classList.toggle("active", p.id === "panel-" + id));
    state.activeTab = id;
    if (id === "history") loadHistory();
    if (id === "templates") loadTemplates();
  }

  // API status check
  async function checkApi() {
    try {
      const r = await fetch(CONFIG.API_URL + "/");
      state.apiOnline = r.ok;
    } catch {
      state.apiOnline = false;
    }
    const indicator = $("api-status");
    if (indicator) {
      indicator.textContent = state.apiOnline ? "API online" : "API offline";
      indicator.className = "api-status " + (state.apiOnline ? "online" : "offline");
    }
  }

  // Init
  async function init() {
    checkApi();
    await loadStats();
    renderHistory();
    loadTemplates();

    // Event listeners
    ["b-cat","b-name","b-code","b-size","b-mat","b-suf","b-fmt"].forEach(id => {
      $(id).addEventListener("input", updatePreview);
    });
    $("save-btn").addEventListener("click", saveSku);
    $("copy-btn").addEventListener("click", copySku);
    $("generate-bulk-btn").addEventListener("click", runBulk);
    $("bulk-save-btn").addEventListener("click", bulkSaveAll);
    $("bulk-export-btn").addEventListener("click", exportBulkCSV);
    $("export-btn").addEventListener("click", exportCSV);
    $("clear-btn").addEventListener("click", clearAll);
    $("save-tmpl-btn").addEventListener("click", saveAsTemplate);

    $$(".tab").forEach(t => t.addEventListener("click", () => switchTab(t.dataset.tab)));
  }

  return { init, toast, deleteSku, clearAll, exportCSV, applyTemplate, applyFilters, deleteTemplate, switchTab, updatePreview, saveSku, copySku, runBulk, bulkSaveAll };
})();

document.addEventListener("DOMContentLoaded", App.init);
