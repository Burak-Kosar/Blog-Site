const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  charset: 'utf8mb4'
});

connection.connect((err) => {
  if (err) {
    console.error('Database bağlantı hatası:', err);
    return;
  }
  console.log('Database bağlantısı başarılı!');
});

module.exports = connection;
