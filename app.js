
const express = require('express');
const http = require('http');
const apiRouter = require('./api');
const bodyParser = require('body-parser');

const app = express();

// Parse JSON bodies
app.use(bodyParser.json());

// Add the API routes
app.use('/api', apiRouter);

// Create a basic HTTP server
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('userMessage', (data) => {
    io.emit('userMessage', {})
  })
  socket.on('psycMessage', (data) => {
    io.emit('psycMessage', {})
  })
  socket.on('readMessage', (data) => {
    io.emit('readMessage', {})
  })
})

// Start the server and listen on port 3000
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});