document.addEventListener("DOMContentLoaded", () => {
    const postsContainer = document.getElementById("posts-container");
    const nextBtn = document.querySelector(".next");
    const prevBtn = document.querySelector(".previous");

    let currentPage = 1;
    const limit = 6;
    const API_BASE = "http://192.168.1.108:4565";

    // Snippet için düz metin
    function getSnippet(html, length = 100) {
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || "").substring(0, length) + "...";
    }

    // HTML içeriğini kısalt, etiketleri koru
    function getContentPreview(html, maxLength = 300) {
        const div = document.createElement("div");
        div.innerHTML = html;

        let charCount = 0;
        function truncateNode(node) {
            if (charCount >= maxLength) {
                node.remove();
                return;
            }
            if (node.nodeType === Node.TEXT_NODE) {
                if (charCount + node.nodeValue.length > maxLength) {
                    node.nodeValue = node.nodeValue.substring(0, maxLength - charCount) + "...";
                    charCount = maxLength;
                } else {
                    charCount += node.nodeValue.length;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                Array.from(node.childNodes).forEach(truncateNode);
            }
        }

        Array.from(div.childNodes).forEach(truncateNode);
        return div.innerHTML;
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
                const snippetText = getSnippet(post.content, 50);       // düz metin snippet
                const contentPreview = getContentPreview(post.content, 200); // HTML etiketli içerik

                article.innerHTML = `
                    <header>
                        <div class="title">
                            <h2><a href="single.html?id=${post.id}">${post.title}</a></h2>
                            <p>${snippetText}</p>
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
                    <div class="content-preview">${contentPreview}</div>
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
