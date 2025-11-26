const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const { TikTokLiveConnection, WebcastEvent } = require("tiktok-live-connector");

// === CONFIG ===
const username = "zhaelee"; // <-- change to streamer username
const PORT = process.env.PORT || 3000; // Railway sets this dynamically

// === EXPRESS + SOCKET.IO SERVER ===
const app = express();
const server = http.createServer(app);

// Setup Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: "*", // allow your overlay page to connect
        methods: ["GET", "POST"]
    },
    transports: ["websocket", "polling"]
});

// Serve overlay files
app.use(express.static("public"));

// Basic test route
app.get("/", (req, res) => {
    res.send("TikTok Overlay Server Running!");
});

// Start server
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// === TIKTOK LIVE CONNECTION ===
const tiktok = new TikTokLiveConnection(username, {
    requestOptions: {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            "Referer": "https://www.tiktok.com/"
        }
    },
    disableEulerFallbacks: true,
    disableSignRequests: false
});

// Auto-retry connect
async function connectTikTok() {
    try {
        const state = await tiktok.connect();
        console.log("Connected to room:", state.roomId);
    } catch (err) {
        console.error("TikTok Connection error:", err);
        console.log("Retrying in 5s...");
        setTimeout(connectTikTok, 5000);
    }
}
connectTikTok();

// === CHAT EVENTS ===
tiktok.on(WebcastEvent.CHAT, data => {
    const msg = `${data.user.uniqueId}: ${data.comment}`;
    console.log("[CHAT]", msg);

    // Emit to overlay via Socket.IO
    io.emit("chat", {
        user: data.user.nickname,
        message: data.comment
    });

    // Save to file
    try {
        fs.appendFileSync("chat.txt", msg + "\n");
    } catch (err) {
        console.error("Failed to save chat:", err);
    }
});

// === GIFT EVENTS ===
tiktok.on(WebcastEvent.GIFT, data => {
    const msg = `${data.user.uniqueId} sent gift ${data.giftId}`;
    console.log("[GIFT]", msg);

    // Emit to overlay
    io.emit("gift", {
        user: data.user.nickname,
        gift: data.giftId
    });

    // OPTIONAL: trigger 3D animation on frontend via "gift" event
});