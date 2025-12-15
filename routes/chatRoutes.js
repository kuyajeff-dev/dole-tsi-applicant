const express = require("express");
const router = express.Router();
const db = require("../db/mysql");

// GET all applicants with last message and unread count
router.get("/applicants", async (req, res) => {
  try {
    const adminId = req.query.admin_id; // get admin id from query/session
    const [rows] = await db.execute(`
      SELECT u.id, u.full_name, u.avatar,
        m.message AS lastMessage,
        COUNT(CASE WHEN m.is_read = 0 AND m.receiver_id = ? THEN 1 END) AS unreadCount,
        MAX(m.created_at) AS lastMessageTime
      FROM users u
      LEFT JOIN chat_messages m ON (u.id = m.sender_id OR u.id = m.receiver_id)
      WHERE u.role = 'user'
      GROUP BY u.id
      ORDER BY lastMessageTime DESC
    `, [adminId]);

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch applicants" });
  }
});

// GET chat history
router.get("/history", async (req, res) => {
  const { user_id, admin_id } = req.query;
  try {
    const [rows] = await db.execute(
      `SELECT c.*, u.full_name, u.avatar
       FROM chat_messages c
       JOIN users u ON c.sender_id = u.id
       WHERE (c.sender_id = ? AND c.receiver_id = ?) 
          OR (c.sender_id = ? AND c.receiver_id = ?)
       ORDER BY c.created_at ASC`,
      [user_id, admin_id, admin_id, user_id]
    );

    const messages = rows.map(msg => ({
      id: msg.id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      message: msg.message,
      full_name: msg.full_name,
      avatar: msg.avatar ? `/uploads/${msg.avatar.replace(/^uploads[\\/]/, "")}` : "/uploads/default-avatar.png",
      created_at: msg.created_at
    }));

    // Mark unread as read
    await db.execute(
      "UPDATE chat_messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0",
      [user_id, admin_id]
    );

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

module.exports = router;
