"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const socket_1 = require("./services/socket");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = __importDefault(require("./config/db"));
const server = http_1.default.createServer(app_1.default);
// Initialize Socket.io
(0, socket_1.initSocket)(server);
(0, db_1.default)();
const PORT = 5137;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
