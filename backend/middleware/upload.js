const multer = require("multer");
const path = require("path");

// Yükleme dizini
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // tüm resimler /uploads içine kaydedilecek
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Sadece resim yükleyebilirsiniz."));
    }
  }
});

module.exports = upload;
