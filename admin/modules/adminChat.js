import { initSocketConnection, sendMessage } from "./adminSocketConnection.js";

const navUserName = document.getElementById("navUserName");
const navAvatar = document.getElementById("navAvatar");
const applicantsList = document.getElementById("applicantsList");
const conversation = document.getElementById("conversation");
const adminSendForm = document.getElementById("adminSendForm");
const adminMessageInput = document.getElementById("adminMessageInput");
const sendBtn = document.getElementById("sendBtn");
const closeChatBtn = document.getElementById("closeChatBtn");
const applicantSearch = document.getElementById("applicantSearch");
const notifSound = document.getElementById("notifSound");

let CURRENT_USER = null;
let selectedApplicant = null;
let applicants = [];
let unreadCounts = {};
let timestampElements = [];

// ---------------- Helpers ----------------
function normalizeAvatar(path) {
    if (!path) return "/uploads/default-avatar.png";
    return `/uploads/${path.replace(/^\/?uploads[\\/]+/, "")}`;
}

function timeAgo(date) {
    const diff = (new Date() - new Date(date)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    return `${Math.floor(diff/86400)}d ago`;
}

function formatUnread(count) {
    return count > 99 ? "99+" : count;
}

// ---------------- Render Chat Message ----------------
function renderMessage(msg, isAdmin) {
    const wrapper = document.createElement("div");
    wrapper.className = `flex gap-2 ${isAdmin ? "justify-end" : "justify-start"} items-start mb-2`;

    const img = document.createElement("img");
    img.src = normalizeAvatar(msg.avatar);
    img.className = "w-8 h-8 rounded-full object-cover border";
    img.onerror = () => img.src = "/uploads/default-avatar.png";

    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = "flex flex-col max-w-xs";

    if (!isAdmin) {
        const senderName = document.createElement("div");
        senderName.textContent = msg.full_name || "User";
        senderName.className = "text-sm font-semibold text-gray-700 mb-1";
        bubbleContainer.appendChild(senderName);
    }

    const bubble = document.createElement("div");
    bubble.className = `px-3 py-2 rounded break-words ${isAdmin ? "bg-blue-700 text-white" : "bg-gray-200 text-black"}`;
    bubble.textContent = msg.message;

    const timestamp = document.createElement("div");
    timestamp.className = "text-xs text-gray-400 mt-1 self-end";
    timestamp.textContent = timeAgo(msg.created_at);

    bubbleContainer.appendChild(bubble);
    bubbleContainer.appendChild(timestamp);
    timestampElements.push({ el: timestamp, date: msg.created_at });

    if (isAdmin) {
        wrapper.appendChild(bubbleContainer);
        wrapper.appendChild(img);
    } else {
        wrapper.appendChild(img);
        wrapper.appendChild(bubbleContainer);
        notifSound.play().catch(() => {});
    }

    // Add unread indicator inside chat if message is unread and chat not selected
    if (!isAdmin && (!selectedApplicant || selectedApplicant.id !== msg.sender_id)) {
        const unreadBubble = document.createElement("div");
        unreadBubble.className = "text-xs text-white bg-red-500 px-2 py-0.5 rounded self-start mt-1";
        unreadBubble.textContent = formatUnread(unreadCounts[msg.sender_id] || 1);
        bubbleContainer.appendChild(unreadBubble);
    }

    conversation.appendChild(wrapper);
    conversation.scrollTop = conversation.scrollHeight;
}

// ---------------- Dynamic timestamps ----------------
setInterval(() => timestampElements.forEach(i => i.el.textContent = timeAgo(i.date)), 30000);

// ---------------- Admin ----------------
async function loadAdmin() {
    try {
        const res = await fetch("/api/user/adminOnly", { credentials: "include" });
        const user = await res.json();
        CURRENT_USER = { id: user.id, full_name: user.full_name, avatar: normalizeAvatar(user.avatar) };
        navUserName.textContent = CURRENT_USER.full_name;
        navAvatar.src = CURRENT_USER.avatar;
    } catch (err) { console.error(err); }
}

// ---------------- Applicants ----------------
async function loadApplicants() {
    try {
        const res = await fetch(`/api/chat/applicants?admin_id=${CURRENT_USER.id}`, { credentials: "include" });
        applicants = await res.json();
        applicants.forEach(a => unreadCounts[a.id] = a.unreadCount || 0);
        renderApplicants();
    } catch (err) { console.error(err); }
}

// ---------------- Render Applicants List ----------------
function renderApplicants(filteredList = null) {
    const list = filteredList || applicants;
    applicantsList.innerHTML = "";

    // Sort: unread first, then last message time
    list.sort((a, b) => {
        const aUnread = unreadCounts[a.id] || 0;
        const bUnread = unreadCounts[b.id] || 0;
        if (bUnread !== aUnread) return bUnread - aUnread;
        return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });

    list.forEach(a => {
        const div = document.createElement("div");
        div.className = "p-3 flex flex-col cursor-pointer hover:bg-gray-100 rounded relative applicant-item";
        div.dataset.id = a.id;

        // Top row: avatar + name
        const topRow = document.createElement("div");
        topRow.className = "flex items-center gap-3";

        const avatar = document.createElement("img");
        avatar.src = normalizeAvatar(a.avatar);
        avatar.className = "w-10 h-10 rounded-full border object-cover";
        avatar.onerror = () => avatar.src = "/uploads/default-avatar.png";

        const name = document.createElement("span");
        name.textContent = a.full_name;
        name.className = "font-semibold";

        topRow.appendChild(avatar);
        topRow.appendChild(name);
        div.appendChild(topRow);

        // Messenger-style unread badge
        const unread = unreadCounts[a.id] || 0;
        if (unread > 0) {
            const badge = document.createElement("div");
            badge.className = "unread-badge";
            badge.textContent = formatUnread(unread);
            div.appendChild(badge);
        }

        // Last message text
        const lastMsg = document.createElement("span");
        lastMsg.dataset.userId = a.id;
        lastMsg.className = "text-gray-500 text-sm mt-1 break-words";
        lastMsg.textContent = a.lastMessage || "";
        div.appendChild(lastMsg);

        // Click to select
        div.addEventListener("click", () => selectApplicant(a));
        applicantsList.appendChild(div);
    });
}
// ---------------- Select Applicant ----------------
async function selectApplicant(a) {
    selectedApplicant = a;
    document.getElementById("chatTitle").textContent = a.full_name;
    closeChatBtn.classList.remove("hidden");
    conversation.innerHTML = "";
    unreadCounts[a.id] = 0;
    renderApplicants();

    try {
        const res = await fetch(`/api/chat/history?user_id=${a.id}&admin_id=${CURRENT_USER.id}`, { credentials: "include" });
        const messages = await res.json();
        messages.forEach(m => renderMessage(m, m.sender_id === CURRENT_USER.id));
    } catch (err) { console.error(err); }

    sendBtn.disabled = false;
}

// ---------------- Close chat ----------------
closeChatBtn.addEventListener("click", () => {
    selectedApplicant = null;
    conversation.innerHTML = '<div id="placeholder" class="text-center text-gray-400 mt-12">Open a conversation to start chatting.</div>';
    document.getElementById("chatTitle").textContent = "Select an applicant";
    closeChatBtn.classList.add("hidden");
    sendBtn.disabled = true;
});

// ---------------- System Notifications ----------------
function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }
}

function showNotification(msg) {
    if (Notification.permission !== "granted") return;
    if (selectedApplicant && msg.sender_id === selectedApplicant.id) return;

    const notification = new Notification(`New message from ${msg.full_name}`, {
        body: msg.message.length > 100 ? msg.message.substring(0, 100) + "…" : msg.message,
        icon: normalizeAvatar(msg.avatar),
        tag: `chat-msg-${msg.sender_id}`
    });

    notification.onclick = () => {
        window.focus();
        selectApplicant(applicants.find(a => a.id === msg.sender_id));
        notification.close();
    };
}

// ---------------- Socket ----------------
function setupSocket() {
    initSocketConnection(CURRENT_USER, (msg) => {
        if (!msg.sender_id) return;

        const isSelected = selectedApplicant && msg.sender_id === selectedApplicant.id;

        if (isSelected) {
            renderMessage(msg, false);
            unreadCounts[msg.sender_id] = 0;
        } else {
            unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
            showNotification(msg);
        }

        const applicant = applicants.find(a => a.id === msg.sender_id);
        if (applicant) {
            applicant.lastMessage = msg.message;
            applicant.lastMessageTime = msg.created_at;
        }

        renderApplicants();
    });
}

// ---------------- Send Message ----------------
adminSendForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!selectedApplicant || !adminMessageInput.value) return;

    const payload = {
        sender_id: CURRENT_USER.id,
        receiver_id: selectedApplicant.id,
        message: adminMessageInput.value,
        avatar: CURRENT_USER.avatar,
        created_at: new Date().toISOString()
    };

    sendMessage(payload);
    renderMessage(payload, true);

    const a = selectedApplicant;
    a.lastMessage = payload.message;
    a.lastMessageTime = payload.created_at;
    renderApplicants();

    adminMessageInput.value = "";
});

// ---------------- Search ----------------
applicantSearch.addEventListener("input", () => {
    const term = applicantSearch.value.toLowerCase();
    renderApplicants(applicants.filter(a => a.full_name.toLowerCase().includes(term)));
});

// ---------------- Initialize ----------------
document.addEventListener("DOMContentLoaded", async () => {
    await loadAdmin();
    await loadApplicants();
    requestNotificationPermission();
    setupSocket();
});
