import { initSocketConnection, sendMessage } from "./userChatConnection.js";
import { renderMessageWithTimestamp } from "./userChatUI.js";

// ----------------- CONSTANTS & ELEMENTS -----------------
let CURRENT_USER = null;
const ADMIN_ID = 1; // Admin ID, can make dynamic if needed
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
let unreadAdminMessages = 0; // Track unread messages from admin

const mobileMenuButton = document.getElementById('mobileMenuButton');
const mobileMenu = document.getElementById('mobileMenu');

// ----------------- UTILITY FUNCTIONS -----------------

/** Normalize avatar path */
function normalizeAvatarPath(path) {
    if (!path) return "/uploads/default-avatar.png";
    return `/uploads/${path.replace(/^\/?uploads[\\/]/, "")}`;
}

/** Update document title with unread messages */
function updateDocumentTitle() {
    document.title = unreadAdminMessages > 0
        ? `(${unreadAdminMessages}) New message(s) - Chat`
        : "Chat with Administrator";
}

// ----------------- CHAT FUNCTIONS -----------------

/** Load logged-in user and initialize chat */
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

        // Initialize socket connection
        initSocketConnection(CURRENT_USER, handleIncomingMessage);

        // Load chat history
        await loadChatHistory();

    } catch (err) {
        console.error("Failed to load user info:", err);
    }
}

/** Load chat history from server */
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
        console.error("Error loading chat history:", err);
    }
}

/** Handle incoming messages from socket */
function handleIncomingMessage(msg) {
    if (!msg) return;

    msg.avatar = normalizeAvatarPath(msg.avatar);
    renderMessageWithTimestamp(msg, CURRENT_USER.id);

    // Increment unread counter only for new admin messages
    if (msg.sender_id === ADMIN_ID) {
        unreadAdminMessages++;
        updateDocumentTitle();
    }
}

/** Handle sending a new chat message */
function handleChatSubmit(e) {
    e.preventDefault();
    if (!messageInput.value) return;

    const payload = {
        sender_id: CURRENT_USER.id,
        receiver_id: ADMIN_ID,
        message: messageInput.value,
        avatar: CURRENT_USER.avatar,
        created_at: new Date().toISOString()
    };

    sendMessage(payload);
    messageInput.value = "";

    // Reset unread counter on send
    unreadAdminMessages = 0;
    updateDocumentTitle();
}

// ----------------- MOBILE NAVBAR TOGGLE -----------------
function initMobileNavbar() {
    if (!mobileMenuButton || !mobileMenu) return;

    mobileMenuButton.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });

    // Close menu when clicking any link
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
}

// ----------------- EVENT LISTENERS -----------------
document.addEventListener("DOMContentLoaded", () => {
    loadUser();           // Load user & initialize chat
    initMobileNavbar();   // Initialize mobile menu

    if (chatForm) {
        chatForm.addEventListener("submit", handleChatSubmit);
    }

    // Reset unread counter when window is focused
    window.addEventListener("focus", () => {
        unreadAdminMessages = 0;
        updateDocumentTitle();
    });
});
