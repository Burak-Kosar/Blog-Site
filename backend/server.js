const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts.api');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Statik dosyalar (frontend ve uploads)
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotalar
app.use('/', authRoutes);
app.use('/', postRoutes);

// Sunucu
const PORT = process.env.PORT || 4565;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server çalışıyor: http://localhost:${PORT}`);
});
