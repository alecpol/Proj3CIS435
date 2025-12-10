// // src/index.js
// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { getDbInstance } = require('./config/db');
// const authRoutes = require('./routes/authRoutes');
// const packRoutes = require('./routes/packRoutes');
// const userRoutes = require("./routes/userRoutes"); 
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/packs', packRoutes);
// app.use('/api/users', userRoutes);

// const PORT = process.env.PORT || 4000;

// (async () => {
//   try {
//     const db = getDbInstance();
//     await db.connect(process.env.MONGO_URI || 'mongodb://localhost:27017');

//     app.listen(PORT, () => {
//       console.log(`Backend listening on port ${PORT}`);
//     });
//   } catch (err) {
//     console.error('Failed to start server:', err);
//     process.exit(1);
//   }
// })();



// src/index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { getDbInstance } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const packRoutesFactory = require("./routes/packRoutes"); // NOTE: we’ll change packRoutes to export a factory
const userRoutes = require("./routes/userRoutes");

const app = express();

// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Simple Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("join-pack", (packId) => {
    if (!packId) return;
    const room = `pack:${packId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
  });

  socket.on("leave-pack", (packId) => {
    if (!packId) return;
    const room = `pack:${packId}`;
    socket.leave(room);
    console.log(`Socket ${socket.id} left room ${room}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes (note: packRoutes now takes io)
const packRoutes = packRoutesFactory(io);
app.use("/api/auth", authRoutes);
app.use("/api/packs", packRoutes);
app.use("/api/users", userRoutes);

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    const db = getDbInstance();
    await db.connect(process.env.MONGO_URI || "mongodb://localhost:27017");

    server.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
