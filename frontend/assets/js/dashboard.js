document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user"));
  if (!token || !user) {
    alert("Önce giriş yapmalısınız");
    window.location.href = "login.html";
    return;
  }

  const API_BASE =
    (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || window.location.origin;

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        await fetch(`${API_BASE}/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {}
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      alert("Çıkış yapıldı");
      window.location.href = "login.html";
    });
  }

  // Quill
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

  // Yeni Post ekle (resimli)
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
      const data = await res.json();
      if (res.ok) {
        alert(
          formData.get("status") === "draft"
            ? "Post taslak olarak kaydedildi!"
            : "Post yayınlandı!"
        );
        addPostForm.reset();
        quill.setContents([]);
        loadMyPosts();
        if (isAdmin()) loadDeleteRequests();
      } else {
        alert(data.error || "Bir hata oluştu");
      }
    });
  }

  async function loadMyPosts() {
    const url = isAdmin() ? `${API_BASE}/all-posts` : `${API_BASE}/my-posts`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const posts = await res.json();

    const tableBody = document.getElementById("myPostsTable");
    if (!tableBody) return;
    tableBody.innerHTML = "";

    posts.forEach((post) => {
      const tr = document.createElement("tr");
      const canRequestDelete = !isAdmin() && post.author === user.username;
      const adminOps = isAdmin();

      tr.innerHTML = `
        <td data-label="Başlık">${post.title || "-"}</td>
        <td data-label="Durum">${post.status}</td>
        <td data-label="Oluşturulma">${new Date(
          post.created_at
        ).toLocaleDateString()}</td>
        <td data-label="Yazar">${post.author}</td>
        <td data-label="İşlemler">
          ${
            post.status === "draft"
              ? `<button class="publishBtn" data-id="${post.id}">Yayınla</button>`
              : ""
          }
          <button class="editBtn" data-id="${post.id}">Düzenle</button>
          ${
            adminOps
              ? `<button class="deleteBtn" data-id="${post.id}">Sil</button>`
              : canRequestDelete
              ? `<button class="requestDeleteBtn" data-id="${post.id}">Sil (Talep)</button>`
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
    document.querySelectorAll(".requestDeleteBtn").forEach((btn) => {
      btn.addEventListener("click", () => requestDelete(btn.dataset.id));
    });
  }

  async function requestDelete(id) {
    if (
      !confirm(
        "Bu post için silme talebi oluşturulsun mu? Post anında yayından kalkacaktır."
      )
    )
      return;
    const reason =
      prompt("İstersen bir sebep yaz (boş bırakabilirsin):") || null;
    const res = await fetch(`${API_BASE}/posts/${id}/request-delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json();
    if (!res.ok) return alert(data.error || "Silme talebi oluşturulamadı");
    alert(data.message || "Silme talebi oluşturuldu.");
    loadMyPosts();
    if (isAdmin()) loadDeleteRequests();
  }

  async function publishPost(id) {
    const res = await fetch(`${API_BASE}/posts/${id}/publish`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      alert("Post yayınlandı!");
      loadMyPosts();
      if (isAdmin()) loadDeleteRequests();
    } else {
      alert(data.error || "Hata");
    }
  }

  async function deletePost(id) {
    if (!confirm("Bu postu KALICI olarak silmek istediğinize emin misiniz?"))
      return;
    const res = await fetch(`${API_BASE}/posts/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (res.ok) {
      alert("Post silindi!");
      loadMyPosts();
      if (isAdmin()) loadDeleteRequests();
    } else {
      alert(data.error || "Hata");
    }
  }

  async function openEditForm(id) {
    try {
      // Admin ise özel endpointi kullan ki published/draft fark etmesin
      const url = isAdmin()
        ? `${API_BASE}/admin/posts/${id}`
        : `${API_BASE}/posts/${id}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const post = await res.json();
      if (!res.ok || !post || (!isAdmin() && post.author !== user.username)) {
        alert((post && post.error) || "Post bulunamadı veya yetkiniz yok");
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
            <input type="text" id="editTitle" value="${post.title || ""}">
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
      editQuill.root.innerHTML = post.content || "";

      document
        .getElementById("cancelEditBtn")
        .addEventListener("click", () => editRow.remove());

      document
        .getElementById("saveEditBtn")
        .addEventListener("click", async () => {
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
          const data = await updateRes.json();
          if (updateRes.ok) {
            alert(
              updatedStatus === "draft"
                ? "Post taslak olarak kaydedildi!"
                : "Post yayınlandı!"
            );
            loadMyPosts();
            if (isAdmin()) loadDeleteRequests();
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

  function isAdmin() {
    return user && user.role === "admin";
  }

  // Admin: Silme Talepleri tablosu + buradan düzenleme/kalıcı silme
  async function loadDeleteRequests() {
    const section = document.getElementById("delete-requests-section");
    if (!section) return;
    section.style.display = isAdmin() ? "block" : "none";
    if (!isAdmin()) return;

    try {
      const res = await fetch(`${API_BASE}/delete-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = await res.json();
      const tbody = document.getElementById("deleteRequestsTable");
      tbody.innerHTML = "";

      rows.forEach((r) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td data-label="Post ID">${r.post_id}</td>
          <td data-label="Başlık">${r.title || "-"}</td>
          <td data-label="Yazar">${r.author || "-"}</td>
          <td data-label="Talep Eden">${r.requested_by || "-"}</td>
          <td data-label="Sebep">${r.reason || "-"}</td>
          <td data-label="Talep Tarihi">${new Date(
            r.requested_at
          ).toLocaleString()}</td>
          <td data-label="İşlem">
            <button class="editFromReqBtn" data-pid="${
              r.post_id
            }">Düzenle</button>
            <button class="hardDeleteBtn" data-pid="${
              r.post_id
            }">Tamamen Sil</button>
          </td>
        `;
        tbody.appendChild(tr);
      });

      // Admin: Taleplerden düzenleme
      document.querySelectorAll(".editFromReqBtn").forEach((btn) => {
        btn.addEventListener("click", () => openEditForm(btn.dataset.pid));
      });

      // Admin: KALICI sil
      document.querySelectorAll(".hardDeleteBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const pid = btn.dataset.pid;
          if (
            !confirm(
              `#${pid} postunu KALICI olarak silmek istiyor musun? Bu işlem geri alınamaz.`
            )
          )
            return;
          const delRes = await fetch(`${API_BASE}/posts/${pid}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await delRes.json();
          if (!delRes.ok) {
            alert(data.error || "Silme sırasında hata");
            return;
          }
          alert("Post kalıcı olarak silindi.");
          loadMyPosts();
          loadDeleteRequests();
        });
      });
    } catch (e) {
      console.error(e);
      const tbody = document.getElementById("deleteRequestsTable");
      if (tbody)
        tbody.innerHTML = `<tr><td colspan="7">Silme talepleri yüklenemedi.</td></tr>`;
    }
  }

  // Başlangıç
  loadMyPosts();
  if (isAdmin()) loadDeleteRequests();
});
