document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));

  if (!token || !user) {
    alert("Önce giriş yapmalısınız");
    window.location.href = "login.html";
    return;
  }

  const API_BASE = window.location.origin;

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await fetch(`${API_BASE}/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        });
      } catch (_) {}
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "login.html";
    });
  }

  // Quill editörü
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

  // Yeni Post ekleme (RESİMLİ)
  const addPostForm = document.getElementById("addPostForm");
  if (addPostForm) {
    addPostForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      document.getElementById("content").value = quill.root.innerHTML;
      const formData = new FormData(addPostForm);

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        const status = formData.get("status");
        alert(status === "draft" ? "Post taslak olarak kaydedildi!" : "Post yayınlandı!");
        addPostForm.reset();
        quill.setContents([]);
        loadMyPosts();
      } else {
        alert(data.error || "Bir hata oluştu");
      }
    });
  }

  // Postları yükle
  async function loadMyPosts() {
    const url = isAdmin() ? `${API_BASE}/all-posts` : `${API_BASE}/my-posts`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const posts = await res.json();

    const tableBody = document.getElementById("myPostsTable");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    posts.forEach((post) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td data-label="Başlık">${post.title}</td>
        <td data-label="Durum">${post.status}</td>
        <td data-label="Oluşturulma">${new Date(post.created_at).toLocaleDateString()}</td>
        <td data-label="Yazar">${post.author}</td>
        <td data-label="İşlemler">
          ${post.status === "draft" ? `<button class="publishBtn" data-id="${post.id}">Yayınla</button>` : ""}
          <button class="editBtn" data-id="${post.id}">Düzenle</button>
          ${
            isAdmin()
              ? `<button class="deleteBtn" data-id="${post.id}">Kalıcı Sil</button>`
              : `<button class="requestDeleteBtn" data-id="${post.id}">Sil </button>`
          }
        </td>
      `;
      tableBody.appendChild(tr);
    });

    // Butonlar
    document.querySelectorAll(".publishBtn").forEach((btn) => {
      btn.addEventListener("click", () => publishPost(btn.dataset.id));
    });
    document.querySelectorAll(".deleteBtn").forEach((btn) => {
      btn.addEventListener("click", () => adminPermanentDelete(btn.dataset.id));
    });
    document.querySelectorAll(".requestDeleteBtn").forEach((btn) => {
      btn.addEventListener("click", () => requestDeletePost(btn.dataset.id));
    });
    document.querySelectorAll(".editBtn").forEach((btn) => {
      btn.addEventListener("click", () => openEditForm(btn.dataset.id));
    });

    // Admin ise silme taleplerini de getir
    if (isAdmin()) {
      document.getElementById("deleteRequestsSection")?.classList.remove("hidden");
      loadDeleteRequests();
    } else {
      document.getElementById("deleteRequestsSection")?.classList.add("hidden");
    }
  }

  async function publishPost(id) {
    const res = await fetch(`${API_BASE}/posts/${id}/publish`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert("Post yayınlandı!");
      loadMyPosts();
    } else {
      alert(data.error || "Hata");
    }
  }

  // Yazar: Silme talebi
  async function requestDeletePost(id) {
    if (!confirm("Bu postu silmek istediğinize emin misiniz? (Admin onayıyla kalıcı silinecek)")) return;
    const res = await fetch(`${API_BASE}/posts/${id}/request-delete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert(data.message || "Silme talebi oluşturuldu. Post yayından kaldırıldı.");
      loadMyPosts(); // yazardan kaybolsun
    } else {
      alert(data.error || "Hata");
    }
  }

  // Admin: Kalıcı sil
  async function adminPermanentDelete(id) {
    if (!confirm("Bu post kalıcı olarak silinsin mi?")) return;
    const res = await fetch(`${API_BASE}/posts/${id}/permanent`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      alert(data.message || "Kalıcı silindi");
      loadMyPosts();
    } else {
      alert(data.error || "Hata");
    }
  }

  // Admin: Silme talepleri
  async function loadDeleteRequests() {
    const section = document.getElementById("deleteRequestsSection");
    const tbody = document.querySelector("#deleteRequestsTable tbody");
    if (!section || !tbody) return;

    const res = await fetch(`${API_BASE}/delete-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const list = await res.json();

    tbody.innerHTML = "";
    list.forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.post_id}</td>
        <td>${r.title}</td>
        <td>${r.author}</td>
        <td>${r.requested_by}</td>
        <td>${r.reason || ""}</td>
        <td>${new Date(r.requested_at).toLocaleDateString()}</td>
        <td><button class="approveDeleteBtn" data-post="${r.post_id}">Tamamen Sil</button></td>
      `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll(".approveDeleteBtn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const postId = btn.dataset.post;
        if (!confirm("Bu post kalıcı olarak silinsin mi?")) return;
        const res = await fetch(`${API_BASE}/posts/${postId}/permanent`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          alert(data.message || "Post kalıcı olarak silindi");
          loadDeleteRequests();
          loadMyPosts();
        } else {
          alert(data.error || "Hata");
        }
      });
    });
  }

  async function openEditForm(id) {
    try {
      const res = await fetch(`${API_BASE}/posts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Post bulunamadı");
        return;
      }
      const post = await res.json();

      // Admin değilse ve kendi postu değilse
      if (!isAdmin() && post.author !== user.username) {
        alert("Yetkiniz yok");
        return;
      }

      const row = document.querySelector(`button.editBtn[data-id="${id}"]`).closest("tr");
      const editRow = document.createElement("tr");
      editRow.innerHTML = `
        <td colspan="5">
          <div class="edit-form">
            <label>Başlık</label>
            <input type="text" id="editTitle" value="${escapeHtml(post.title)}">
            <label>İçerik</label>
            <div id="editQuill"></div>
            <label>Durum</label>
            <select id="editStatus">
              <option value="draft" ${post.status === "draft" ? "selected" : ""}>Taslak</option>
              <option value="published" ${post.status === "published" ? "selected" : ""}>Yayınla</option>
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
      editQuill.root.innerHTML = post.content || "";

      document.getElementById("cancelEditBtn").addEventListener("click", () => editRow.remove());

      document.getElementById("saveEditBtn").addEventListener("click", async () => {
        const updatedTitle = document.getElementById("editTitle").value;
        const updatedContent = editQuill.root.innerHTML;
        const updatedStatus = document.getElementById("editStatus").value;

        const updateRes = await fetch(`${API_BASE}/posts/${id}`, {
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

        const data = await updateRes.json().catch(() => ({}));
        if (updateRes.ok) {
          alert(updatedStatus === "draft" ? "Post taslak olarak kaydedildi!" : "Post yayınlandı!");
          loadMyPosts();
          editRow.remove();
        } else {
          alert(data.error || "Güncelleme hatası");
        }
      });
    } catch (err) {
      console.error(err);
      alert("Sunucu hatası");
    }
  }

  function escapeHtml(s = "") {
    return s.replace(/[&<>'"]/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[c]);
  }

  function isAdmin() {
    return user?.role === "admin";
  }

  loadMyPosts();
});
