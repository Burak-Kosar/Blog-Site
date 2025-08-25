document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get("id");

    const postContainer = document.getElementById("single-post");
    const prevBtn = document.getElementById("prev-post");
    const nextBtn = document.getElementById("next-post");

    if (!postId) {
        postContainer.innerHTML = "<p>Hikaye bulunamadı.</p>";
        document.getElementById("post-navigation").style.display = "none";
        return;
    }

    fetch(`http://localhost:4565/posts/${postId}`)
        .then(res => res.json())
        .then(post => {
            if (post.error) {
                postContainer.innerHTML = "<p>Hikaye bulunamadı.</p>";
                document.getElementById("post-navigation").style.display = "none";
                return;
            }

            postContainer.innerHTML = `
                <article class="post">
                    <header>
                        <div class="title">
                            <h2>${post.title}</h2>
                            <p>${post.content.substring(0, 100)}...</p>
                        </div>
                        <div class="meta">
                            <time class="published">${new Date(post.created_at).toLocaleDateString()}</time>
                            <a href="#" class="author"><span class="name">${post.author}</span><img src="images/avatar.jpg" alt="" /></a>
                        </div>
                    </header>
                    <a href="#" class="image featured"><img src="images/pic01.jpg" alt=""></a>
                    <p>${post.content}</p>
                </article>
            `;

            // Önceki & Sonraki Post Bağlantıları
            if (post.prevId) {
                prevBtn.href = `single.html?id=${post.prevId}`;
                prevBtn.classList.remove("disabled");
            } else {
                prevBtn.classList.add("disabled");
            }

            if (post.nextId) {
                nextBtn.href = `single.html?id=${post.nextId}`;
                nextBtn.classList.remove("disabled");
            } else {
                nextBtn.classList.add("disabled");
            }
        })
        .catch(err => {
            console.error(err);
            postContainer.innerHTML = "<p>Sunucu hatası.</p>";
            document.getElementById("post-navigation").style.display = "none";
        });
});
