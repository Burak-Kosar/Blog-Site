const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'Token bulunamadı' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token geçersiz' });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token doğrulanamadı' });
        req.user = user;
        next();
    });
};
