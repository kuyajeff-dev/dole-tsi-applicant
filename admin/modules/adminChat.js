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

/* ---------------- Helpers ---------------- */
function normalizeAvatar(path) {
    if (!path) return "/uploads/default-avatar.png";
    return `/uploads/${path.replace(/^\/?uploads[\\/]+/, "")}`;
}

function timeAgo(date) {
    const diff = (new Date() - new Date(date)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

function formatUnread(count) {
    return count > 99 ? "99+" : count;
}

/* ---------------- Render Message ---------------- */
function renderMessage(msg, isAdmin, autoScroll = true) {
    const wrapper = document.createElement("div");
    wrapper.className = `flex gap-2 ${isAdmin ? "justify-end" : "justify-start"} mb-2`;

    const img = document.createElement("img");
    img.src = normalizeAvatar(msg.avatar);
    img.className = "w-8 h-8 rounded-full border object-cover";
    img.onerror = () => img.src = "/uploads/default-avatar.png";

    const bubbleBox = document.createElement("div");
    bubbleBox.className = "flex flex-col max-w-xs";

    if (!isAdmin) {
        const name = document.createElement("div");
        name.className = "text-xs font-semibold text-gray-600 mb-1";
        name.textContent = msg.full_name || "User";
        bubbleBox.appendChild(name);
    }

    const bubble = document.createElement("div");
    bubble.className = isAdmin
        ? "bg-blue-700 text-white px-3 py-2 rounded"
        : "bg-gray-200 text-black px-3 py-2 rounded";
    bubble.textContent = msg.message;

    const time = document.createElement("div");
    time.className = "text-xs text-gray-400 mt-1 self-end";
    time.textContent = timeAgo(msg.created_at);
    timestampElements.push({ el: time, date: msg.created_at });

    bubbleBox.appendChild(bubble);
    bubbleBox.appendChild(time);

    if (isAdmin) {
        wrapper.appendChild(bubbleBox);
        wrapper.appendChild(img);
    } else {
        wrapper.appendChild(img);
        wrapper.appendChild(bubbleBox);
    }

    conversation.appendChild(wrapper);
    if (autoScroll) conversation.scrollTop = conversation.scrollHeight;
}

/* ---------------- Dynamic timestamps ---------------- */
setInterval(() => {
    timestampElements.forEach(t => t.el.textContent = timeAgo(t.date));
}, 30000);

/* ---------------- Admin ---------------- */
async function loadAdmin() {
    const res = await fetch("/api/user/adminOnly", { credentials: "include" });
    const user = await res.json();
    CURRENT_USER = {
        id: user.id,
        full_name: user.full_name,
        avatar: normalizeAvatar(user.avatar)
    };
    navUserName.textContent = CURRENT_USER.full_name;
    navAvatar.src = CURRENT_USER.avatar;
}

/* ---------------- Applicants ---------------- */
async function loadApplicants() {
    const res = await fetch(`/api/chat/applicants?admin_id=${CURRENT_USER.id}`, { credentials: "include" });
    applicants = await res.json();

    applicants.forEach(a => {
        unreadCounts[a.id] = a.unreadCount || 0;
        a.lastMessageTime = a.lastMessageTime || 0;
    });

    renderApplicants();
}

/* ---------------- Sort + Render Applicants ---------------- */
function sortApplicants(list) {
    return list.sort((a, b) => {
        const au = unreadCounts[a.id] || 0;
        const bu = unreadCounts[b.id] || 0;
        if (bu !== au) return bu - au;
        return new Date(b.lastMessageTime || 0) - new Date(a.lastMessageTime || 0);
    });
}

function renderApplicants(filtered = null) {
    const list = sortApplicants(filtered || applicants);
    applicantsList.innerHTML = "";

    list.forEach(a => {
        const div = document.createElement("div");
        div.className = "p-3 hover:bg-gray-100 cursor-pointer rounded relative";

        div.innerHTML = `
            <div class="flex gap-3 items-center">
                <img src="${normalizeAvatar(a.avatar)}"
                     class="w-10 h-10 rounded-full border object-cover">
                <div class="flex-1">
                    <div class="font-semibold">${a.full_name}</div>
                    <div class="text-sm text-gray-500 truncate">
                        ${a.lastMessage || ""}
                    </div>
                </div>
            </div>
        `;

        const unread = unreadCounts[a.id] || 0;
        if (unread > 0) {
            const badge = document.createElement("div");
            badge.className = "unread-badge";
            badge.textContent = formatUnread(unread);
            div.appendChild(badge);
        }

        div.onclick = () => selectApplicant(a);
        applicantsList.appendChild(div);
    });
}

/* ---------------- Select Applicant (FIXED) ---------------- */
async function selectApplicant(a) {
    selectedApplicant = a;
    unreadCounts[a.id] = 0;

    document.getElementById("chatTitle").textContent = a.full_name;
    closeChatBtn.classList.remove("hidden");
    conversation.innerHTML = "";

    const res = await fetch(`/api/chat/history?user_id=${a.id}&admin_id=${CURRENT_USER.id}`, { credentials: "include" });
    let messages = await res.json();

    messages.sort((x, y) => new Date(x.created_at) - new Date(y.created_at));

    messages.forEach((m, i) =>
        renderMessage(m, m.sender_id === CURRENT_USER.id, i === messages.length - 1)
    );

    /* ✅ CRITICAL FIX: update last message from history */
    if (messages.length) {
        const last = messages[messages.length - 1];
        a.lastMessage = last.message;
        a.lastMessageTime = last.created_at;
    }

    renderApplicants();
    sendBtn.disabled = false;
}
/* ---------------- Close Chat ---------------- */
closeChatBtn.addEventListener("click", () => {
    selectedApplicant = null;

    conversation.innerHTML = `
        <div class="text-center text-gray-400 mt-12">
            Open a conversation to start chatting.
        </div>
    `;

    document.getElementById("chatTitle").textContent = "Select an applicant";
    closeChatBtn.classList.add("hidden");
    sendBtn.disabled = true;

    // Important: re-render to remove active/unread state
    renderApplicants();
});

/* ---------------- Socket (WHATSAPP STYLE) ---------------- */
function setupSocket() {
    initSocketConnection(CURRENT_USER, msg => {
        if (!msg.sender_id) return;

        let a = applicants.find(x => x.id === msg.sender_id);
        if (!a) return;

        a.lastMessage = msg.message;
        a.lastMessageTime = msg.created_at;

        if (selectedApplicant && selectedApplicant.id === msg.sender_id) {
            renderMessage(msg, false);
            unreadCounts[msg.sender_id] = 0;
        } else {
            unreadCounts[msg.sender_id] = (unreadCounts[msg.sender_id] || 0) + 1;
            notifSound.play().catch(() => {});
        }

        renderApplicants();
    });
}

/* ---------------- Send Message ---------------- */
adminSendForm.addEventListener("submit", e => {
    e.preventDefault();
    if (!selectedApplicant || !adminMessageInput.value.trim()) return;

    const payload = {
        sender_id: CURRENT_USER.id,
        receiver_id: selectedApplicant.id,
        message: adminMessageInput.value,
        avatar: CURRENT_USER.avatar,
        created_at: new Date().toISOString()
    };

    sendMessage(payload);
    renderMessage(payload, true);

    selectedApplicant.lastMessage = payload.message;
    selectedApplicant.lastMessageTime = payload.created_at;

    renderApplicants();
    adminMessageInput.value = "";
});

/* ---------------- Search ---------------- */
applicantSearch.addEventListener("input", () => {
    const term = applicantSearch.value.toLowerCase();
    renderApplicants(applicants.filter(a => a.full_name.toLowerCase().includes(term)));
});

/* ---------------- Init ---------------- */
document.addEventListener("DOMContentLoaded", async () => {
    await loadAdmin();
    await loadApplicants();
    setupSocket();
});
