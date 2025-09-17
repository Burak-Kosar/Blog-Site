document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("addPostForm");
  const token = localStorage.getItem("token");
  const API_BASE = window.APP_CONFIG?.API_BASE ?? "";

  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();
    const status = document.getElementById("status").value;

    if (!title || !content) {
      alert("Lütfen tüm alanları doldurun.");
      return;
    }

    fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ title, content, status })
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error);
      } else {
        alert("Hikaye başarıyla eklendi!");
        form.reset();
        if (typeof loadMyPosts === "function") {
          loadMyPosts();
        }
      }
    })
    .catch(err => {
      console.error(err);
      alert("Sunucu hatası!");
    });
  });
});
