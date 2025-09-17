document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const API_BASE = window.APP_CONFIG?.API_BASE ?? "";

  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => res.json())
  .then(data => {
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      window.location.href = 'dashboard.html';
    } else {
      alert(data.error || 'Giriş başarısız');
    }
  })
  .catch(err => {
    console.error(err);
    alert("Sunucu hatası, giriş yapılamadı.");
  });
});
