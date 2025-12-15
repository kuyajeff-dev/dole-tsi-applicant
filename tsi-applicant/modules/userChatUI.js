const notificationSound = new Audio("/tsi-applicant/sounds/notification.mp3"); // notification sound

/** Normalize avatar path */
function normalizeAvatarPath(path) {
    if (!path) return "/uploads/default-avatar.png";
    return `/uploads/${path.replace(/^\/?uploads[\\/]/, "")}`;
}

/** Get "time ago" text */
function timeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Store timestamp elements for live updating
const timestampElements = [];

/**
 * Render a single chat message
 * @param {Object} msg - message object {sender_id, avatar, message, full_name, created_at}
 * @param {number} currentUserId - ID of the current logged-in user
 */
export function renderMessageWithTimestamp(msg, currentUserId) {
    const chatBox = document.getElementById("chatBox");
    if (!chatBox) return;

    const isUser = msg.sender_id === currentUserId;

    const wrapper = document.createElement("div");
    wrapper.className = `flex gap-2 ${isUser ? "justify-end" : "justify-start"} items-start mb-2`;

    // Avatar
    const img = document.createElement("img");
    img.src = normalizeAvatarPath(msg.avatar);
    img.className = "w-8 h-8 rounded-full";

    // Bubble container
    const bubbleContainer = document.createElement("div");
    bubbleContainer.className = "flex flex-col max-w-xs";

    // Sender name (only for admin messages)
    if (!isUser) {
        const senderName = document.createElement("div");
        senderName.textContent = msg.full_name || "Admin";
        senderName.className = "text-sm font-semibold text-gray-700 mb-1";
        bubbleContainer.appendChild(senderName);
    }

    // Bubble text
    const bubble = document.createElement("div");
    bubble.className = `px-3 py-2 rounded break-words ${isUser ? "bg-blue-700 text-white" : "bg-gray-200 text-black"}`;
    bubble.textContent = msg.message;

    // Timestamp
    const timestamp = document.createElement("div");
    timestamp.className = "text-xs text-gray-400 mt-1 self-end";
    const createdAt = msg.created_at ? new Date(msg.created_at) : new Date();
    timestamp.textContent = timeAgo(createdAt);

    // Store for live update
    timestampElements.push({ el: timestamp, date: createdAt });

    bubbleContainer.appendChild(bubble);
    bubbleContainer.appendChild(timestamp);

    if (isUser) {
        wrapper.appendChild(bubbleContainer);
        wrapper.appendChild(img);
    } else {
        wrapper.appendChild(img);
        wrapper.appendChild(bubbleContainer);

        // Play notification sound
        notificationSound.play().catch(err => console.warn("Notification sound error:", err));
    }

    chatBox.appendChild(wrapper);

    // Auto-scroll
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Update timestamps every 30 seconds
setInterval(() => {
    timestampElements.forEach(item => {
        item.el.textContent = timeAgo(item.date);
    });
}, 30000);
