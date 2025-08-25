document.addEventListener("DOMContentLoaded", () => {
  const miniPostsWrapper = document.querySelector("#sidebar .mini-posts");
  const postsListWrapper = document.querySelector("#sidebar .posts");

  // 📌 Tek kullanılacak resim
  const defaultImage1 = "images/pic07.jpg"; // Buraya elinde olan herhangi bir görseli koyabilirsin
  const defaultImage2 = "images/pic08.jpg"
  // 📌 1. En güncel post → Mini Posts alanına
  fetch("http://localhost:4565/posts?limit=1&page=1")
    .then(res => res.json())
    .then(data => {
      if (!data.posts || data.posts.length === 0) return;

      const post = data.posts[0];
      miniPostsWrapper.insertAdjacentHTML("beforeend", `
        <article class="mini-post">
          <header>
            <h3><a href="single.html?id=${post.id}">${post.title}</a></h3>
            <time class="published" datetime="${post.created_at}">
              ${new Date(post.created_at).toLocaleDateString()}
            </time>
            <a href="#" class="author">
              <img src="images/avatar.jpg" alt=""/>
            </a>
          </header>
          <a href="single.html?id=${post.id}" class="image">
            <img src="${defaultImage1}" alt=""/>
          </a>
        </article>
      `);
    })
    .catch(err => console.error("Mini Post fetch error:", err));

  // 📌 2. Sonraki 5 post → Sidebar Posts List alanına
  fetch("http://localhost:4565/posts?limit=5&page=1")
    .then(res => res.json())
    .then(data => {
      if (!data.posts || data.posts.length === 0) return;

      postsListWrapper.innerHTML = "";
      data.posts.forEach(post => {
        postsListWrapper.insertAdjacentHTML("beforeend", `
          <li>
            <article>
              <header>
                <h3><a href="single.html?id=${post.id}">${post.title}</a></h3>
                <time class="published" datetime="${post.created_at}">
                  ${new Date(post.created_at).toLocaleDateString()}
                </time>
              </header>
              <a href="single.html?id=${post.id}" class="image">
                <img src="${defaultImage2}" alt=""/>
              </a>
            </article>
          </li>
        `);
      });
    })
    .catch(err => console.error("Sidebar Posts fetch error:", err));
});
