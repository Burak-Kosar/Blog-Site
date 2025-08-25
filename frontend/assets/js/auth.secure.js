const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const bcrypt = require('bcryptjs'); // güvenli sürüm için gerekiyor

// 📌 Güvenli giriş — bcrypt ile hash kontrolü
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Veritabanı hatası' });
        if (results.length === 0) return res.status(400).json({ error: 'Kullanıcı bulunamadı' });

        const user = results[0];

        try {
            // bcrypt ile şifre karşılaştırma
            const passwordMatch = await bcrypt.compare(password, user.password);
            if (!passwordMatch) {
                return res.status(400).json({ error: 'Şifre hatalı' });
            }

            // JWT token üret
            const token = jwt.sign(
                { id: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });

        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Şifre kontrolünde hata' });
        }
    });
});

module.exports = router;
