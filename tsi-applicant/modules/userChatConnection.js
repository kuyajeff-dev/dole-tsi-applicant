let socket = null;

export function initSocketConnection(user, onMessage) {
    if (!user) return;
    if (socket) return; // <-- prevent multiple connections

    socket = io();

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
        socket.emit("joinRoom", { userId: user.id, isAdmin: false });
    });

    socket.on("newMessage", msg => {
        if (onMessage) onMessage(msg);
    });
}

export function sendMessage(payload) {
    if (!socket) return;
    socket.emit("sendMessage", payload);
}
