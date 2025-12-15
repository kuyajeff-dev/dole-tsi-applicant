import { initSocketConnection, sendMessage } from "./userChatConnection.js";
import { renderMessageWithTimestamp } from "./userChatUI.js";

let CURRENT_USER = null;
const ADMIN_ID = 1; // Admin ID, can make dynamic
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

// Track unread messages from admin
let unreadAdminMessages = 0;

/** Normalize avatar path */
function normalizeAvatarPath(path) {
    if (!path) return "/uploads/default-avatar.png";
    return `/uploads/${path.replace(/^\/?uploads[\\/]/, "")}`;
}

/** Update document title with unread messages */
function updateDocumentTitle() {
    if (unreadAdminMessages > 0) {
        document.title = `(${unreadAdminMessages}) New message(s) - Chat`;
    } else {
        document.title = "Chat with Administrator";
    }
}

/** Load logged-in user */
async function loadUser() {
    try {
        const res = await fetch("/api/user/userOnly", { credentials: "include" });
        if (!res.ok) throw new Error("User not logged in");

        const data = await res.json();

        CURRENT_USER = {
            id: data.id,
            full_name: data.full_name,
            avatar: normalizeAvatarPath(data.avatar)
        };

        // Update navbar
        const navUserName = document.getElementById("navUserName");
        const navAvatar = document.getElementById("navAvatar");
        if (navUserName) navUserName.textContent = CURRENT_USER.full_name;
        if (navAvatar) navAvatar.src = CURRENT_USER.avatar;

        // Initialize socket
        initSocketConnection(CURRENT_USER, handleIncomingMessage);

        // Load chat history
        await loadChatHistory();

    } catch (err) {
        console.error("Failed to load user info:", err);
    }
}

/** Load chat history */
async function loadChatHistory() {
    try {
        const res = await fetch(`/api/chat/history?user_id=${CURRENT_USER.id}&admin_id=${ADMIN_ID}`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load chat history");

        const messages = await res.json();
        messages.forEach(msg => {
            msg.avatar = normalizeAvatarPath(msg.avatar);
            renderMessageWithTimestamp(msg, CURRENT_USER.id);
        });

        unreadAdminMessages = 0;
        updateDocumentTitle();

    } catch (err) {
        console.error(err);
    }
}

/** Handle incoming messages from socket */
function handleIncomingMessage(msg) {
    if (!msg) return;

    msg.avatar = normalizeAvatarPath(msg.avatar);
    renderMessageWithTimestamp(msg, CURRENT_USER.id);

    // Play sound and increment unread counter only for new admin messages
    if (msg.sender_id === ADMIN_ID) {
        unreadAdminMessages++;
        updateDocumentTitle();
    }
}

/** Handle form submit */
if (chatForm) {
    chatForm.addEventListener("submit", e => {
        e.preventDefault();
        if (!messageInput.value) return;

        const payload = {
            sender_id: CURRENT_USER.id,
            receiver_id: ADMIN_ID,
            message: messageInput.value,
            avatar: CURRENT_USER.avatar,
            created_at: new Date().toISOString() // Set timestamp immediately
        };
        sendMessage(payload);

        messageInput.value = "";

        // Reset unread counter
        unreadAdminMessages = 0;
        updateDocumentTitle();
    });
}

// Reset unread counter when window is focused
window.addEventListener("focus", () => {
    unreadAdminMessages = 0;
    updateDocumentTitle();
});

// Initialize user on page load
document.addEventListener("DOMContentLoaded", loadUser);
