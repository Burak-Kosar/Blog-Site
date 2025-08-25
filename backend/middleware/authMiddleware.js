const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token gerekli' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token bulunamadı' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Geçersiz token' });
        req.user = user;
        next();
    });
}

module.exports = authMiddleware;
