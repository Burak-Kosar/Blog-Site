document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('http://localhost:4565/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.token) {
            // ✅ Hem token hem user kaydediyoruz
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
