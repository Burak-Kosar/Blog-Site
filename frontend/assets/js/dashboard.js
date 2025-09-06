document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    alert("Önce giriş yapmalısınız");
    window.location.href = "login.html";
    return;
  }

  // 🔹 Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (token) {
        await fetch("http://192.168.1.108:4565/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      }
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert("Çıkış yapıldı");
      window.location.href = "login.html";
    });
  }

  // 🔹 Quill editörü
  const quill = new Quill("#editor", {
    theme: "snow",
    placeholder: "İçeriği buraya yazınız...",
    modules: {
      toolbar: [
        ["bold", "italic", "underline", "strike"],
        [{ header: [1, 2, 3, false] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["blockquote", "code-block"],
        ["link"],
        ["clean"],
      ],
    },
  });

  // 🔹 Yeni Post ekleme (RESİMLİ)
  const addPostForm = document.getElementById("addPostForm");
  if (addPostForm) {
    addPostForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      document.getElementById("content").value = quill.root.innerHTML;
      const formData = new FormData(addPostForm);

      const res = await fetch("http://192.168.1.108:4565/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        const status = formData.get("status");
        alert(
          status === "draft"
            ? "Post taslak olarak kaydedildi!"
            : "Post yayınlandı!"
        );
        addPostForm.reset();
        quill.setContents([]);
        loadMyPosts();
      } else {
        const data = await res.json();
        alert(data.error || "Bir hata oluştu");
      }
    });
  }

  // 🔹 Postları yükle
  async function loadMyPosts() {
    const url = isAdmin()
      ? "http://192.168.1.108:4565/all-posts"
      : "http://192.168.1.108:4565/my-posts";
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const posts = await res.json();
    const tableBody = document.getElementById("myPostsTable");
    tableBody.innerHTML = "";

    posts.forEach((post) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${post.title}</td>
        <td>${post.status}</td>
        <td>${new Date(post.created_at).toLocaleDateString()}</td>
        <td>${post.author}</td>
        <td>
            ${
              post.status === "draft"
                ? `<button class="publishBtn" data-id="${post.id}">Yayınla</button>`
                : ""
            }
            <button class="editBtn" data-id="${post.id}">Düzenle</button>
            ${
              isAdmin()
                ? `<button class="deleteBtn" data-id="${post.id}">Sil</button>`
                : ""
            }
        </td>
      `;
      tableBody.appendChild(tr);
    });

    document.querySelectorAll(".publishBtn").forEach((btn) => {
      btn.addEventListener("click", () => publishPost(btn.dataset.id));
    });
    document.querySelectorAll(".deleteBtn").forEach((btn) => {
      btn.addEventListener("click", () => deletePost(btn.dataset.id));
    });
    document.querySelectorAll(".editBtn").forEach((btn) => {
      btn.addEventListener("click", () => openEditForm(btn.dataset.id));
    });
  }

  async function publishPost(id) {
    const res = await fetch(`http://192.168.1.108:4565/${id}/publish`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      alert("Post yayınlandı!");
      loadMyPosts();
    } else {
      const data = await res.json();
      alert(data.error || "Hata");
    }
  }

  async function deletePost(id) {
    if (!confirm("Bu postu silmek istediğinize emin misiniz?")) return;
    const res = await fetch(`http://192.168.1.108:4565/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      alert("Post silindi!");
      loadMyPosts();
    } else {
      const data = await res.json();
      alert(data.error || "Hata");
    }
  }

  // 🔹 Düzenleme (taslak veya yayınlanmış farketmez)
  async function openEditForm(id) {
    try {
      const res = await fetch(`http://192.168.1.108:4565/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || "Post bulunamadı");
        return;
      }

      const post = await res.json();

      if (!post || (post.author !== user.username && !isAdmin())) {
        alert("Post bulunamadı veya yetkiniz yok");
        return;
      }

      const row = document
        .querySelector(`button.editBtn[data-id="${id}"]`)
        .closest("tr");
      const editRow = document.createElement("tr");
      editRow.innerHTML = `
        <td colspan="5">
          <div class="edit-form">
            <label>Başlık</label>
            <input type="text" id="editTitle" value="${post.title}">
            <label>İçerik</label>
            <div id="editQuill"></div>
            <label>Durum</label>
            <select id="editStatus">
              <option value="draft" ${
                post.status === "draft" ? "selected" : ""
              }>Taslak</option>
              <option value="published" ${
                post.status === "published" ? "selected" : ""
              }>Yayınla</option>
            </select>
            <button id="saveEditBtn">Kaydet</button>
            <button id="cancelEditBtn">İptal</button>
          </div>
        </td>
      `;
      row.insertAdjacentElement("afterend", editRow);

      const editQuill = new Quill("#editQuill", {
        theme: "snow",
        modules: {
          toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ header: [1, 2, 3, false] }],
            [{ list: "ordered" }, { list: "bullet" }],
            ["blockquote", "code-block"],
            ["link"],
            ["clean"],
          ],
        },
      });
      editQuill.root.innerHTML = post.content;

      document.getElementById("cancelEditBtn").addEventListener("click", () => {
        editRow.remove();
      });

      document
        .getElementById("saveEditBtn")
        .addEventListener("click", async () => {
          const updatedTitle = document.getElementById("editTitle").value;
          const updatedContent = editQuill.root.innerHTML;
          const updatedStatus = document.getElementById("editStatus").value;

          const updateRes = await fetch(`http://192.168.1.108:4565/${id}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              title: updatedTitle,
              content: updatedContent,
              status: updatedStatus,
            }),
          });

          if (updateRes.ok) {
            alert(
              updatedStatus === "draft"
                ? "Post taslak olarak kaydedildi!"
                : "Post yayınlandı!"
            );
            loadMyPosts();
            editRow.remove();
          } else {
            const data = await updateRes.json();
            alert(data.error || "Güncelleme hatası");
          }
        });
    } catch (err) {
      console.error(err);
      alert("Sunucu hatası");
    }
  }

  function isAdmin() {
    return user.role === "admin";
  }

  loadMyPosts();
});
