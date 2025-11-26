const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");
const { TikTokLiveConnection, WebcastEvent } = require("tiktok-live-connector");

// === CONFIG ===
const username = "mcdono.1lover"; // <-- change to streamer username
const PORT = 3000;

// Express + Socket.io server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve overlay files
app.use(express.static("public"));

// Start server
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

// TikTok LIVE connection
const tiktok = new TikTokLiveConnection(username, {
    requestOptions: {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
            "Referer": "https://www.tiktok.com/"
        }
    },
    disableEulerFallbacks: true,
    disableSignRequests: false // fallback if errors persist
});

// Connect with auto-retry
async function connectTikTok() {
    try {
        const state = await tiktok.connect();
        console.log("Connected to room:", state.roomId);
    } catch (err) {
        console.log("Connection error:", err);
        console.log("Retrying in 5s...");
        setTimeout(connectTikTok, 5000);
    }
}
connectTikTok();

// Listen to chat
tiktok.on(WebcastEvent.CHAT, data => {
    const msg = `${data.user.uniqueId}: ${data.comment}`;
    console.log("[CHAT]", msg);
    io.emit("chat", { user: data.user.nickname, message: data.comment });
    fs.appendFileSync("chat.txt", msg + "\n"); // save to file
});

// Listen to gifts
tiktok.on(WebcastEvent.GIFT, data => {
    const msg = `${data.user.uniqueId} sent gift ${data.giftId}`;
    console.log("[GIFT]", msg);
    io.emit("gift", { user: data.user.nickname, gift: data.giftId });
});
