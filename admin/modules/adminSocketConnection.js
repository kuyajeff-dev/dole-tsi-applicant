let socket = null;

/** Initialize socket connection for admin */
export function initSocketConnection(admin, onMessage) {
    if (!admin) return;
    if (socket) return; // prevent multiple connections

    socket = io(); // connect to server

    socket.on("connect", () => {
        console.log("Admin connected:", socket.id);
        socket.emit("joinRoom", { userId: admin.id, isAdmin: true });
    });

    // Handle incoming messages
    socket.on("newMessage", msg => {
        if (onMessage) onMessage(msg);
    });
}

/** Send a message from admin to a user */
export function sendMessage(payload) {
    if (!socket) return;
    socket.emit("sendMessage", payload);
}
