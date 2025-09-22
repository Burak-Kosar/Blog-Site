const express = require("express");
const router = express.Router();
const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

/* ------------------ Yardımcı: Yedek Kaydet ------------------ */
function saveBackup(postRow, action, actedBy, cb = () => {}) {
  if (!postRow) return cb();
  const sql = `
    INSERT INTO posts_backup
      (post_id, title, content, author_id, status, image, action, acted_by, acted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  db.query(
    sql,
    [
      postRow.id,
      postRow.title || null,
      postRow.content || null,
      postRow.author_id,
      postRow.status || null,
      postRow.image || null,
      action,
      actedBy,
    ],
    (err) => cb(err)
  );
}

/* ------------------ 1) Yayınlanmış postları getir (sayfalı) ------------------ */
router.get("/posts", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const offset = (page - 1) * limit;

  const sqlCount = `SELECT COUNT(*) AS total FROM posts WHERE status = 'published'`;
  const sqlPosts = `
    SELECT p.*, u.username AS author
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.status = 'published'
    ORDER BY p.created_at DESC
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

/* ------------------ 2) Tek yayınlanmış post (prev/next ile) ------------------ */
router.get("/posts/:id", (req, res) => {
  const postId = parseInt(req.params.id, 10);

  const sql = `
    SELECT p.*, u.username AS author
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.id = ? AND p.status = 'published'
  `;

  db.query(sql, [postId], (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (results.length === 0)
      return res.status(404).json({ error: "Hikaye bulunamadı" });

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

/* ------------------ 2b) Admin: herhangi bir postu getir (status fark etmez) ------------------ */
router.get("/admin/posts/:id", authMiddleware, (req, res) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ error: "Yetkiniz yok" });
  const postId = parseInt(req.params.id, 10);

  const sql = `
    SELECT p.*, u.username AS author
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.id = ?
  `;
  db.query(sql, [postId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (rows.length === 0)
      return res.status(404).json({ error: "Post bulunamadı" });
    res.json(rows[0]);
  });
});

/* ------------------ 3) Yeni post ekle (resimli) ------------------ */
router.post(
  "/posts",
  authMiddleware,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, content, status } = req.body;
      const authorId = req.user.id;

      let imagePath = null;
      if (req.file) {
        const outputPath = path.join("uploads", "resized-" + req.file.filename);
        await sharp(req.file.path).resize(840, 340).toFile(outputPath);
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        imagePath = "/" + outputPath.replace(/\\/g, "/");
      }

      const sql = `
      INSERT INTO posts (title, content, author_id, status, image, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;
      db.query(
        sql,
        [title, content, authorId, status, imagePath],
        (err, result) => {
          if (err) return res.status(500).json({ error: "Veritabanı hatası" });

          // create backup snapshot
          const newRow = {
            id: result.insertId,
            title,
            content,
            author_id: authorId,
            status,
            image: imagePath,
          };
          saveBackup(newRow, "create", req.user.id);

          res.json({
            message: "Post eklendi",
            postId: result.insertId,
            imageUrl: imagePath,
          });
        }
      );
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Post eklenemedi" });
    }
  }
);

/* ------------------ 4) Kullanıcının kendi postları (silme talebi olanları gizle) ------------------ */
router.get("/my-posts", authMiddleware, (req, res) => {
  const sql = `
    SELECT p.*, u.username AS author
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.author_id = ?
      AND NOT EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.post_id = p.id)
    ORDER BY p.created_at DESC
  `;
  db.query(sql, [req.user.id], (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    res.json(results);
  });
});

/* ------------------ 5) Tüm postlar (admin) (silme talebi olanları gizle) ------------------ */
router.get("/all-posts", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Yetkiniz yok" });
  }
  const sql = `
    SELECT p.*, u.username AS author
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE NOT EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.post_id = p.id)
    ORDER BY p.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    res.json(results);
  });
});

/* ------------------ 6) Taslaklar (silme talebi olanları gizle) ------------------ */
router.get("/posts/drafts", authMiddleware, (req, res) => {
  let sql = `
    SELECT p.*, u.username AS author
    FROM posts p
    JOIN users u ON p.author_id = u.id
    WHERE p.status = 'draft'
      AND NOT EXISTS (SELECT 1 FROM delete_requests dr WHERE dr.post_id = p.id)
  `;
  const params = [];
  if (req.user.role !== "admin") {
    sql += ` AND p.author_id = ?`;
    params.push(req.user.id);
  }
  sql += ` ORDER BY p.created_at DESC`;

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    res.json(results);
  });
});

/* ------------------ 7) Taslağı yayınla ------------------ */
router.patch("/posts/:id/publish", authMiddleware, (req, res) => {
  const postId = req.params.id;
  const checkSql =
    req.user.role === "admin"
      ? `SELECT * FROM posts WHERE id = ?`
      : `SELECT * FROM posts WHERE id = ? AND author_id = ?`;
  const checkParams =
    req.user.role === "admin" ? [postId] : [postId, req.user.id];

  db.query(checkSql, checkParams, (err, rows) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (rows.length === 0)
      return res.status(404).json({ error: "Post bulunamadı" });

    const before = rows[0];
    saveBackup(before, "publish", req.user.id, () => {
      const updateSql = `UPDATE posts SET status = 'published', updated_at = NOW() WHERE id = ?`;
      db.query(updateSql, [postId], (err2, result) => {
        if (err2) return res.status(500).json({ error: "Güncelleme hatası" });
        if (result.affectedRows === 0) {
          return res.status(400).json({ error: "Post zaten yayınlanmış" });
        }
        res.json({ success: true, message: "Post yayınlandı" });
      });
    });
  });
});

/* ------------------ 8) Post düzenle ------------------ */
router.put("/posts/:id", authMiddleware, (req, res) => {
  const postId = req.params.id;
  const { title, content, status } = req.body;

  const checkSql =
    req.user.role === "admin"
      ? `SELECT * FROM posts WHERE id = ?`
      : `SELECT * FROM posts WHERE id = ? AND author_id = ?`;
  const checkParams =
    req.user.role === "admin" ? [postId] : [postId, req.user.id];

  db.query(checkSql, checkParams, (err, rows) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (rows.length === 0)
      return res
        .status(404)
        .json({ error: "Post bulunamadı veya yetkiniz yok" });

    const before = rows[0];
    saveBackup(before, "update", req.user.id, () => {
      const updateSql = `
        UPDATE posts 
        SET title = ?, content = ?, status = ?, updated_at = NOW()
        WHERE id = ?
      `;
      db.query(updateSql, [title, content, status, postId], (err2, result) => {
        if (err2) return res.status(500).json({ error: "Güncelleme hatası" });
        if (result.affectedRows === 0) {
          return res.status(400).json({ error: "Post güncellenemedi" });
        }
        res.json({ success: true, message: "Post güncellendi" });
      });
    });
  });
});

/* ------------------ 9) Post sil (admin) + resmi kaldır + yedek ------------------ */
router.delete("/posts/:id", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Yetkiniz yok" });
  }
  const postId = req.params.id;

  db.query(`SELECT * FROM posts WHERE id = ?`, [postId], (err, rows) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    if (rows.length === 0)
      return res.status(404).json({ error: "Post bulunamadı" });

    const postRow = rows[0];
    const imagePath = postRow.image ? postRow.image.replace(/^\//, "") : null;

    saveBackup(postRow, "delete", req.user.id, () => {
      db.query(`DELETE FROM posts WHERE id = ?`, [postId], (err2, result) => {
        if (err2) return res.status(500).json({ error: "Veritabanı hatası" });
        if (result.affectedRows === 0)
          return res.status(404).json({ error: "Post bulunamadı" });

        if (imagePath && fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
        res.json({ success: true, message: "Post silindi" });
      });
    });
  });
});

/* ------------------ 10) Silme talebi (yazar/admin tetikler) ------------------ */
router.post("/posts/:id/request-delete", authMiddleware, (req, res) => {
  const postId = parseInt(req.params.id, 10);
  const reason = req.body && req.body.reason ? String(req.body.reason) : null;

  db.query(`SELECT * FROM posts WHERE id = ?`, [postId], (e1, rows) => {
    if (e1) return res.status(500).json({ error: "Veritabanı hatası" });
    if (rows.length === 0)
      return res.status(404).json({ error: "Post bulunamadı" });

    const post = rows[0];

    if (req.user.role !== "admin" && req.user.id !== post.author_id) {
      return res.status(403).json({ error: "Yetkiniz yok" });
    }

    db.query(
      `SELECT id FROM delete_requests WHERE post_id = ?`,
      [postId],
      (e2, dr) => {
        if (e2) return res.status(500).json({ error: "Veritabanı hatası" });

        // yedek: talep anı
        saveBackup(post, "request_delete", req.user.id, () => {
          // postu draft yap
          db.query(
            `UPDATE posts SET status='draft', updated_at = NOW() WHERE id = ?`,
            [postId],
            (eUpd) => {
              if (eUpd)
                return res
                  .status(500)
                  .json({ error: "Post yayından kaldırılamadı" });

              if (dr.length > 0) {
                return res.json({
                  success: true,
                  message:
                    "Zaten silme talebi mevcut, post yayından kaldırıldı",
                });
              }

              const insSql = `
            INSERT INTO delete_requests (post_id, author_id, requested_by, reason)
            VALUES (?, ?, ?, ?)
          `;
              db.query(
                insSql,
                [post.id, post.author_id, req.user.id, reason],
                (e3) => {
                  if (e3) {
                    console.error("delete_requests insert error:", e3);
                    return res
                      .status(500)
                      .json({ error: "Silme talebi kaydedilemedi" });
                  }
                  return res.json({
                    success: true,
                    message: "Silme talebi kaydedildi",
                  });
                }
              );
            }
          );
        });
      }
    );
  });
});

/* ------------------ 11) Admin: Silme talepleri listesi ------------------ */
router.get("/delete-requests", authMiddleware, (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Yetkiniz yok" });
  }

  const sql = `
    SELECT 
      dr.id AS request_id,
      p.id AS post_id,
      p.title,
      u1.username AS author,
      u2.username AS requested_by,
      dr.reason,
      dr.requested_at
    FROM delete_requests dr
    JOIN posts p   ON dr.post_id = p.id
    JOIN users u1  ON p.author_id = u1.id
    JOIN users u2  ON dr.requested_by = u2.id
    ORDER BY dr.requested_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ error: "Veritabanı hatası" });
    res.json(rows);
  });
});

module.exports = router;
