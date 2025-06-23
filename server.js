const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`👤 ${socket.id} joined room ${room}`);
  });

  socket.on("send_message", ({ room, encryptedMessage, sender }) => {
    console.log(`[${room}] ${sender}: ${encryptedMessage}`);
    socket.to(room).emit("receive_message", { encryptedMessage, sender });
  });

  socket.on("leave_room", (room) => {
    socket.leave(room);
    console.log(`🚪 ${socket.id} left room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
