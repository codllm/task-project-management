import http from "http";
import app from "./app";
import { initSocket } from "./services/socket";
import { startScheduler } from "./services/scheduler";

import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db";
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

connectDB().then(() => {
  startScheduler();
});

const PORT = 5137;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});