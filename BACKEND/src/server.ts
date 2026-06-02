import http from "http";
import app from "./app";

import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db";
const server = http.createServer(app);

connectDB();

const PORT = 5137;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});