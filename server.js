require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bodyParser = require('body-parser');

const callRoutes = require('./routes/callRoutes');
const { handleStream } = require('./services/streamHandler');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    console.log(`[Incoming Request] ${req.method} ${req.url}`);
    next();
});


// Routes
app.use('/api', callRoutes);

// WebSocket Handling
// Twilio connects to wss://your-url.com/stream
wss.on('connection', (ws, req) => {
    // Check if the connection request is for the stream path
    if (req.url === '/stream') {
        handleStream(ws);
    } else {
        ws.close();
    }
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`-------------------------------------------`);
    console.log(`Server listening on port ${PORT}`);
    console.log(`Ensure SERVER_URL in .env is public (e.g. ngrok)`);
    console.log(`-------------------------------------------`);
});