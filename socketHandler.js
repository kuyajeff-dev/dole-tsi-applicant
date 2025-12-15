const db = require('./db/mysql');

module.exports = (io) => {
    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        // Join a room for each user
        socket.on("joinRoom", ({ userId, isAdmin }) => {
            socket.join(`user_${userId}`);
            console.log(`${isAdmin ? "Admin" : "User"} ${userId} joined room user_${userId}`);
        });

        // Handle sending messages
        socket.on("sendMessage", async (payload) => {
            try {
                const { sender_id, receiver_id, message } = payload;

                // Save message to DB
                const [result] = await db.execute(
                    "INSERT INTO chat_messages (sender_id, receiver_id, message) VALUES (?, ?, ?)",
                    [sender_id, receiver_id, message]
                );

                // Fetch sender info
                const [rows] = await db.execute(
                    "SELECT full_name, avatar FROM users WHERE id = ?",
                    [sender_id]
                );

                const sender = rows[0] || { full_name: "Unknown", avatar: null };
                const avatarUrl = sender.avatar
                    ? `/uploads/${sender.avatar.replace(/^\/?uploads[\\/]/, "")}`
                    : "/uploads/default-avatar.png";

                const msg = {
                    id: result.insertId,
                    sender_id,
                    receiver_id,
                    message,
                    full_name: sender.full_name,
                    avatar: avatarUrl,
                    created_at: new Date().toISOString()
                };

                // Emit to both sender and receiver rooms
                io.to(`user_${sender_id}`).emit("newMessage", msg);
                io.to(`user_${receiver_id}`).emit("newMessage", msg);

            } catch (err) {
                console.error("Error saving/sending message:", err);
            }
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });
};
