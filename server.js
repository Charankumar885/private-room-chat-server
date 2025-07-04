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

// Track rooms and users
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("🔌 New connection:", socket.id);

  socket.on("join_room", ({ room, username, secretKey }, callback) => {
    if (!room || !username || !secretKey) {
      return callback({ success: false, error: "All fields are required" });
    }

    if (!rooms.has(room)) {
      rooms.set(room, {
        users: new Map(),
        secretKey
      });
    }

    const roomData = rooms.get(room);

    if (roomData.secretKey !== secretKey) {
      return callback({ success: false, error: "Invalid secret key" });
    }

    if (Array.from(roomData.users.values()).includes(username)) {
      return callback({ success: false, error: "Username already taken" });
    }

    roomData.users.set(socket.id, username);
    socket.join(room);
    socket.data = { room, username };

    socket.to(room).emit("user_joined", username);
    updateUserList(room);

    callback({
      success: true,
      users: Array.from(roomData.users.values())
    });

    console.log(`✅ ${username} joined room: ${room}`);
  });

  socket.on("send_message", ({ encryptedMessage, sender }) => {
    const { room, username } = socket.data || {};
    if (!room || sender !== username || !encryptedMessage) return;

    io.to(room).emit("receive_message", { encryptedMessage, sender });
  });

  socket.on("leave_room", (room) => {
    const { username } = socket.data || {};
    socket.leave(room);
    socket.to(room).emit("user_left", username);

    const roomData = rooms.get(room);
    if (roomData) {
      roomData.users.delete(socket.id);
      if (roomData.users.size === 0) {
        rooms.delete(room);
      } else {
        updateUserList(room);
      }
    }
  });

  socket.on("disconnect", () => {
    const { room, username } = socket.data || {};
    if (room && username) {
      socket.to(room).emit("user_left", username);
      const roomData = rooms.get(room);
      if (roomData) {
        roomData.users.delete(socket.id);
        if (roomData.users.size === 0) {
          rooms.delete(room);
        } else {
          updateUserList(room);
        }
      }
    }
    console.log("❌ Disconnected:", socket.id);
  });
});

function updateUserList(room) {
  if (rooms.has(room)) {
    const users = Array.from(rooms.get(room).users.values());
    io.to(room).emit("room_users", users);
  }
}

// ✅ Use environment port (Render) or fallback for local testing
const PORT = process.env.PORT || 3001; // 3001 is for local fallback
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

