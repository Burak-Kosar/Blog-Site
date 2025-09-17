document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBtn");
  const API_BASE = window.APP_CONFIG?.API_BASE ?? "";

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const token = localStorage.getItem("token");

      fetch(`${API_BASE}/logout`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      .then(res => res.json())
      .then(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
      })
      .catch(err => {
        console.error("Logout hatası:", err);
        alert("Çıkış sırasında hata oluştu.");
      });
    });
  }
});
