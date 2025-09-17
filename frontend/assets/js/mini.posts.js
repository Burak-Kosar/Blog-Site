document.addEventListener("DOMContentLoaded", () => {
  const miniPostsWrapper = document.querySelector("#sidebar .mini-posts");
  const postsListWrapper = document.querySelector("#sidebar .posts");
  const API_BASE = window.APP_CONFIG?.API_BASE ?? "";

  const defaultImage = "images/pic07.jpg";

  // Son 1 post → Mini Posts
  fetch(`${API_BASE}/posts?limit=1&page=1`)
    .then(res => res.json())
    .then(data => {
      if (!data.posts || data.posts.length === 0) return;
      const post = data.posts[0];
      const imageSrc = post.image ? post.image.replace(/\\/g, "/") : defaultImage;

      miniPostsWrapper.innerHTML = `
        <article class="mini-post">
          <header>
            <h3><a href="single.html?id=${post.id}">${post.title}</a></h3>
            <time class="published" datetime="${post.created_at}">
              ${new Date(post.created_at).toLocaleDateString()}
            </time>
          </header>
          <a href="single.html?id=${post.id}" class="image">
            <img src="${imageSrc}" alt=""/>
          </a>
        </article>
      `;
    });

  // Sonraki 5 post → Sidebar Posts List (ilk post tekrar etmesin diye page=2)
  fetch(`${API_BASE}/posts?limit=5&page=2`)
    .then(res => res.json())
    .then(data => {
      if (!data.posts || data.posts.length === 0) return;

      postsListWrapper.innerHTML = "";
      data.posts.forEach(post => {
        const imageSrc = post.image ? post.image.replace(/\\/g, "/") : defaultImage;
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
                <img src="${imageSrc}" alt=""/>
              </a>
            </article>
          </li>
        `);
      });
    });
});
