const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

/**
 * 📌 1. Yayınlanmış postları getir (sayfalı)
 */
router.get("/posts", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const offset = (page - 1) * limit;

  const sqlCount = `SELECT COUNT(*) AS total FROM posts WHERE status = 'published'`;
  const sqlPosts = `
        SELECT posts.*, users.username AS author
        FROM posts
        JOIN users ON posts.author_id = users.id
        WHERE posts.status = 'published'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `;

  db.query(sqlCount, (err, countResults) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });

    const totalPosts = countResults[0].total;
    const totalPages = Math.ceil(totalPosts / limit);

    db.query(sqlPosts, [limit, offset], (err2, results) => {
      if (err2) return res.status(500).json({ error: "Veritabanı hatası" });
      res.json({ posts: results, totalPages, currentPage: page });
    });
  });
});

/**
 * 📌 2. Tek postu getir (önceki/sonraki ID ile)
 */
router.get("/posts/:id", (req, res) => {
  const postId = parseInt(req.params.id, 10);

  const sql = `
        SELECT posts.*, users.username AS author
        FROM posts
        JOIN users ON posts.author_id = users.id
        WHERE posts.id = ? AND posts.status = 'published'
    `;

  db.query(sql, [postId], (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (results.length === 0)
      return res.status(404).json({ error: "Post ID bulunamadı" });

    const post = results[0];
    const navSql = `
            SELECT 
                (SELECT id FROM posts WHERE id < ? AND status='published' ORDER BY id DESC LIMIT 1) AS prevId,
                (SELECT id FROM posts WHERE id > ? AND status='published' ORDER BY id ASC LIMIT 1) AS nextId
        `;
    db.query(navSql, [postId, postId], (err2, navResults) => {
      if (err2) return res.status(500).json({ error: "Veritabanı hatası" });
      post.prevId = navResults[0].prevId;
      post.nextId = navResults[0].nextId;
      res.json(post);
    });
  });
});

/**
 * 📌 3. Yeni post ekle (resimli)
 */
router.post("/posts", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    const { title, content, status } = req.body;
    const authorId = req.user.id;

    let imagePath = null;

    if (req.file) {
      const outputPath = path.join("uploads", "resized-" + req.file.filename);

      await sharp(req.file.path).resize(840, 340).toFile(outputPath);

      fs.unlinkSync(req.file.path); // orijinali sil

      imagePath = "/" + outputPath;
    }

    const sql = `
      INSERT INTO posts (title, content, author_id, status, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
    db.query(sql, [title, content, authorId, status, imagePath], (err, result) => {
      if (err) return res.status(500).json({ error: "Veritabanı hatası" });

      res.json({
        message: "Post eklendi",
        postId: result.insertId,
        imageUrl: imagePath,
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Post eklenemedi" });
  }
});

/**
 * 📌 4. Kullanıcının kendi postları
 */
router.get("/my-posts", authMiddleware, (req, res) => {
  const sql = `
        SELECT posts.*, users.username AS author
        FROM posts
        JOIN users ON posts.author_id = users.id
        WHERE posts.author_id = ?
        ORDER BY created_at DESC
    `;
  db.query(sql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    res.json(results);
  });
});

/**
 * 📌 5. Tüm postları getir (sadece admin)
 */
router.get("/all-posts", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Yetkiniz yok" });
  }
  const sql = `
        SELECT posts.*, users.username AS author
        FROM posts
        JOIN users ON posts.author_id = users.id
        ORDER BY created_at DESC
    `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    res.json(results);
  });
});

/**
 * 📌 6. Taslakları getir
 */
router.get("/posts/drafts", authMiddleware, (req, res) => {
  let sql = `
        SELECT posts.*, users.username AS author
        FROM posts
        JOIN users ON posts.author_id = users.id
        WHERE posts.status = 'draft'
    `;
  let params = [];
  if (req.user.role !== "admin") {
    sql += ` AND posts.author_id = ?`;
    params.push(req.user.id);
  }
  sql += ` ORDER BY created_at DESC`;
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    res.json(results);
  });
});

/**
 * 📌 7. Taslağı yayınla
 */
router.patch("/posts/:id/publish", authMiddleware, (req, res) => {
  const postId = req.params.id;
  const checkSql =
    req.user.role === "admin"
      ? `SELECT * FROM posts WHERE id = ?`
      : `SELECT * FROM posts WHERE id = ? AND author_id = ?`;
  const checkParams =
    req.user.role === "admin" ? [postId] : [postId, req.user.id];

  db.query(checkSql, checkParams, (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (results.length === 0)
      return res.status(404).json({ error: "Post bulunamadı" });

    const updateSql = `UPDATE posts SET status = 'published', updated_at = NOW() WHERE id = ?`;
    db.query(updateSql, [postId], (err2) => {
      if (err2) return res.status(500).json({ error: "Güncelleme hatası" });
      res.json({ success: true, message: "Post yayınlandı" });
    });
  });
});

/**
 * 📌 8. Post düzenle
 */
router.put("/posts/:id", authMiddleware, (req, res) => {
  const postId = req.params.id;
  const { title, content, status } = req.body;

  const checkSql =
    req.user.role === "admin"
      ? `SELECT * FROM posts WHERE id = ?`
      : `SELECT * FROM posts WHERE id = ? AND author_id = ?`;
  const checkParams =
    req.user.role === "admin" ? [postId] : [postId, req.user.id];

  db.query(checkSql, checkParams, (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (results.length === 0)
      return res
        .status(404)
        .json({ error: "Post bulunamadı veya yetkiniz yok" });

    const updateSql = `
            UPDATE posts 
            SET title = ?, content = ?, status = ?, updated_at = NOW()
            WHERE id = ?
        `;
    db.query(updateSql, [title, content, status, postId], (err2) => {
      if (err2) return res.status(500).json({ error: "Güncelleme hatası" });
      res.json({ success: true, message: "Post güncellendi" });
    });
  });
});

/**
 * 📌 9. Post sil (sadece admin)
 */
router.delete("/posts/:id", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Yetkiniz yok" });
  }
  const postId = req.params.id;
  db.query(`DELETE FROM posts WHERE id = ?`, [postId], (err, result) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Post bulunamadı" });
    res.json({ success: true, message: "Post silindi" });
  });
});

module.exports = router;
