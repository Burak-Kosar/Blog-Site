// config.js
// Aynı origin: API_BASE = "" → fetch('/posts') çalışır.
(function () {
  const API_BASE = ""; // backend ve frontend aynı origin
  window.APP_CONFIG = { API_BASE };
})();
