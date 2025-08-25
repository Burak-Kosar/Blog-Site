const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');

const authRoutes = require('./routes/auth'); // sadece router'ı direkt import ediyoruz
const postRoutes = require('./routes/posts.api');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Statik dosyalar
app.use(express.static('../frontend'));

// Rotalar
app.use('/', authRoutes);
app.use('/', postRoutes);

// Uploads klasörü için statik middleware
app.use("/uploads", express.static("uploads"));

// Sunucu
const PORT = process.env.PORT || 4565;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server çalışıyor : http://localhost:${PORT}`);
});
