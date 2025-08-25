document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logoutBtn");

    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();

            const token = localStorage.getItem("token");

            fetch("http://localhost:4565/logout", {
                method: "POST",
                headers: { 
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            })
            .then(res => res.json())
            .then(() => {
                // ✅ LocalStorage temizle
                localStorage.removeItem("token");
                localStorage.removeItem("user");

                // Login sayfasına dön
                window.location.href = "login.html";
            })
            .catch(err => {
                console.error("Logout hatası:", err);
                alert("Çıkış sırasında hata oluştu.");
            });
        });
    }
});
