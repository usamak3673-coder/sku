// sku.js — SKU generation and utilities
const SKUEngine = (() => {
  const CATEGORIES = {
    FURN: "Furniture",
    ELEC: "Electronics",
    APRL: "Apparel",
    FOOD: "Food & Beverage",
    HLTH: "Health & Beauty",
    TOYS: "Toys & Games",
    SPRT: "Sports",
    HOME: "Home & Garden",
    BOOK: "Books & Media",
    AUTO: "Automotive"
  };

  function abbr(str, max = 6) {
    if (!str || !str.trim()) return "";
    return str.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, max);
  }

  function build(cat, name, code, size, mat, suf, fmt) {
    const sep = fmt === "DASH" ? "-" : fmt === "UNDER" ? "_" : "";
    const parts = [
      cat,
      abbr(name, 6),
      code ? abbr(code, 4) : null,
      size ? abbr(size, 4) : null,
      mat ? abbr(mat, 4) : null,
      suf ? abbr(suf, 6) : null
    ].filter(Boolean);
    return parts.join(sep);
  }

  function validate(sku) {
    if (!sku || sku === "—") return { valid: false, msg: "Fill in category and product name" };
    if (sku.length < 4) return { valid: false, msg: "SKU too short" };
    if (sku.length > 32) return { valid: false, msg: "SKU too long (max 32 chars)" };
    return { valid: true, msg: "" };
  }

  function toCSV(skus) {
    const header = "SKU,Product Name,Category,Format,Date";
    const rows = skus.map(s =>
      `"${s.sku}","${s.productName}","${s.category}","${s.format}","${new Date(s.createdAt).toLocaleDateString()}"`
    );
    return [header, ...rows].join("\n");
  }

  function downloadCSV(content, filename) {
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(content);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return { CATEGORIES, abbr, build, validate, toCSV, downloadCSV };
})();
