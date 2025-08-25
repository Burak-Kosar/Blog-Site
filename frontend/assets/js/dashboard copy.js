document.addEventListener("DOMContentLoaded", () => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!token) {
        alert("Önce giriş yapmalısınız");
        window.location.href = "login.html";
        return;
    }

    // Yeni post ekleme
    document.getElementById("addPostForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = document.getElementById("title").value;
        const content = document.getElementById("content").value;
        const status = document.getElementById("status").value;

        const res = await fetch("http://localhost:4565/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ title, content, status })
        });
        const data = await res.json();
        if (res.ok) {
            alert("Post eklendi!");
            loadMyPosts();
            e.target.reset();
        } else {
            alert(data.error || "Bir hata oluştu");
        }
    });

    // Postları yükle
    async function loadMyPosts() {
        const res = await fetch("http://localhost:4565/my-posts", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        const posts = await res.json();
        const tableBody = document.getElementById("myPostsTable");
        tableBody.innerHTML = "";

        if (posts.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='4'>Henüz yazınız yok</td></tr>";
            return;
        }

        posts.forEach(post => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${post.title}</td>
                <td>${post.status}</td>
                <td>${new Date(post.created_at).toLocaleDateString()}</td>
                <td>
                    ${post.status === "draft" ? `<button class="publishBtn" data-id="${post.id}">Yayınla</button>` : ""}
                    <button class="editBtn" data-id="${post.id}" data-title="${post.title}" data-content="${post.content}" data-status="${post.status}">Düzenle</button>
                    ${isAdmin() ? `<button class="deleteBtn" data-id="${post.id}">Sil</button>` : ""}
                </td>
            `;
            tableBody.appendChild(tr);
        });

        addTableEventListeners();
    }

    function addTableEventListeners() {
        // Yayınlama
        document.querySelectorAll(".publishBtn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const postId = btn.dataset.id;
                const res = await fetch(`http://localhost:4565/posts/${postId}/publish`, {
                    method: "PATCH",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    alert("Post yayınlandı!");
                    loadMyPosts();
                } else {
                    alert("Yayınlama hatası");
                }
            });
        });

        // Düzenleme
        document.querySelectorAll(".editBtn").forEach(btn => {
            btn.addEventListener("click", async () => {
                const postId = btn.dataset.id;
                const currentTitle = btn.dataset.title;
                const currentContent = btn.dataset.content;
                const currentStatus = btn.dataset.status;

                const newTitle = prompt("Yeni başlık:", currentTitle);
                if (newTitle === null) return;
                const newContent = prompt("Yeni içerik:", currentContent);
                if (newContent === null) return;
                const newStatus = confirm("Yayınlansın mı?") ? "published" : "draft";

                const res = await fetch(`http://localhost:4565/posts/${postId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify({ title: newTitle, content: newContent, status: newStatus })
                });
                if (res.ok) {
                    alert("Post güncellendi!");
                    loadMyPosts();
                } else {
                    alert("Güncelleme hatası");
                }
            });
        });

        // Silme
        document.querySelectorAll(".deleteBtn").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (!confirm("Bu postu silmek istediğinize emin misiniz?")) return;
                const postId = btn.dataset.id;
                const res = await fetch(`http://localhost:4565/posts/${postId}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                    alert("Post silindi!");
                    loadMyPosts();
                } else {
                    alert("Silme hatası");
                }
            });
        });
    }

    function isAdmin() {
        return user && user.role === "admin";
    }

    // İlk yükleme
    loadMyPosts();

    // Çıkış
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "login.html";
    });
});
