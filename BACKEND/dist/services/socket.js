"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitToProject = exports.emitToUser = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
let io;
const userSockets = new Map(); // Map<UserId, SocketId>
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE"],
            credentials: true,
        },
    });
    io.on("connection", (socket) => {
        console.log("Client connected via Socket.io:", socket.id);
        // User joins their personal room
        socket.on("join-user-room", (userId) => {
            socket.join(`user:${userId}`);
            userSockets.set(userId, socket.id);
            // Broadcast that this user is online
            io.emit("user:online", { userId });
            console.log(`User ${userId} joined their personal room`);
        });
        // User joins a project room (for live kanban updates)
        socket.on("join-project-room", (projectId) => {
            socket.join(`project:${projectId}`);
            console.log(`Socket ${socket.id} joined project room: ${projectId}`);
        });
        // Handle typing indicators
        socket.on("typing:start", (data) => {
            socket.to(`project:${data.projectId}`).emit("typing:started", data);
        });
        socket.on("typing:stop", (data) => {
            socket.to(`project:${data.projectId}`).emit("typing:stopped", data);
        });
        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
            // Remove from online mapping
            for (const [userId, sockId] of userSockets.entries()) {
                if (sockId === socket.id) {
                    userSockets.delete(userId);
                    io.emit("user:offline", { userId });
                    break;
                }
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
exports.getIO = getIO;
const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};
exports.emitToUser = emitToUser;
const emitToProject = (projectId, event, data) => {
    if (io) {
        io.to(`project:${projectId}`).emit(event, data);
    }
};
exports.emitToProject = emitToProject;
