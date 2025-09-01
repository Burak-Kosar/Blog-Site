document.addEventListener("DOMContentLoaded", () => {
    const postsContainer = document.getElementById("posts-container");
    const nextBtn = document.querySelector(".next");
    const prevBtn = document.querySelector(".previous");

    let currentPage = 1;
    const limit = 6;
    const API_BASE = "http://localhost:4565";

    // HTML etiketlerini temizleyen fonksiyon (snippet için)
    function stripHtml(html) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    }

    async function loadPosts(page = 1) {
        try {
            const res = await fetch(`${API_BASE}/posts?page=${page}&limit=${limit}`);
            const data = await res.json();

            if (!res.ok) {
                postsContainer.innerHTML = `<p>Hata: ${data.error || 'Bilinmeyen hata'}</p>`;
                return;
            }

            postsContainer.innerHTML = "";

            data.posts.forEach(post => {
                const article = document.createElement("article");
                article.classList.add("post");

                const imageSrc = post.image ? post.image.replace(/\\/g, "/") : "images/pic07.jpg";

                // Preview snippet için kısa metin
                const previewText = stripHtml(post.content).substring(0, 100) + "...";

                // Post içeriği HTML olarak korunuyor
                const contentHtml = post.content;

                article.innerHTML = `
                    <header>
                        <div class="title">
                            <h2><a href="single.html?id=${post.id}">${post.title}</a></h2>
                            <p>${previewText}</p>
                        </div>
                        <div class="meta">
                            <time class="published">${new Date(post.created_at).toLocaleDateString()}</time>
                            <a href="#" class="author">
                                <span class="name">${post.author}</span>
                                <img src="images/avatar.jpg" alt="" />
                            </a>
                        </div>
                    </header>
                    <a href="single.html?id=${post.id}" class="image featured">
                        <img src="${imageSrc}" alt="">
                    </a>
                    <div class="post-content">
                        ${contentHtml}
                    </div>
                    <footer>
                        <ul class="actions">
                            <li><a href="single.html?id=${post.id}" class="button large">Devamını Oku</a></li>
                        </ul>
                        <ul class="stats">
                            <li><a href="#">General</a></li>
                            <li><a href="#" class="icon solid fa-heart">0</a></li>
                            <li><a href="#" class="icon solid fa-comment">0</a></li>
                        </ul>
                    </footer>
                `;
                postsContainer.appendChild(article);
            });

            prevBtn.classList.toggle("disabled", page <= 1);
            nextBtn.classList.toggle("disabled", page >= data.totalPages);

        } catch (err) {
            postsContainer.innerHTML = `<p>Bağlantı hatası: ${err.message}</p>`;
        }
    }

    nextBtn.addEventListener("click", (e) => {
        e.preventDefault();
        currentPage++;
        loadPosts(currentPage);
    });

    prevBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            loadPosts(currentPage);
        }
    });

    loadPosts();
});
