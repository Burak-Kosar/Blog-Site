document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("addPostForm");
    const token = localStorage.getItem("token");

    if (!form) return; // Form yoksa çık

    form.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = document.getElementById("title").value.trim();
        const content = document.getElementById("content").value.trim();
        const status = document.getElementById("status").value;

        if (!title || !content) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        fetch("http://localhost:4565/posts", {
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
                // Post ekledikten sonra listeleri güncelle
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
