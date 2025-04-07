const express = require('express');
const cors = require('cors');
const {Server} = require('socket.io');
const http = require('http');

const app = express();  
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});