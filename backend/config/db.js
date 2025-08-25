const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createConnection({
    host: '127.0.0.1',
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
});

connection.connect((err) => {
    if (err) {
        console.error('Database bağlantı hatası:', err);
        return;
    }
    console.log('Database bağlantısı başarılı!');
});

module.exports = connection;
