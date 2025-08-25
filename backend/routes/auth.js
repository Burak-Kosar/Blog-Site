const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const blacklist = [];

// ✅ LOGIN
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
        if (results.length === 0) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });

        const user = results[0];
        if (password !== user.password) {
            return res.status(400).json({ error: 'Şifre hatalı' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
});

// ✅ LOGOUT
router.post('/logout', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) blacklist.push(token);
    res.json({ message: 'Çıkış başarılı' });
});

// 👇 Router'ı ve middleware'i ayrı export et
module.exports =  router;

