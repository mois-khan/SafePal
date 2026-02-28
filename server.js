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
// --- NEW: The Flutter Client Registry ---
const flutterClients = new Set();

const broadcastToFlutter = (payload) => {
    flutterClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(payload));
        }
    });
};

// --- UPDATED: WebSocket Handling ---
wss.on('connection', (ws, req) => {
    if (req.url === '/stream') {
        // 1. Twilio connecting to stream audio
        // We now pass 'broadcastToFlutter' as a second argument!
        handleStream(ws, broadcastToFlutter); 

    } else if (req.url === '/flutter-alerts') {
        // 2. Mobile App connecting to listen for scams
        console.log('📱 Flutter App Connected to Alerts Channel!');
        flutterClients.add(ws);

        // Send a handshake so the app knows it connected successfully
        ws.send(JSON.stringify({ type: "SYSTEM", message: "Monitoring Active" }));

        ws.on('close', () => {
            console.log('📱 Flutter App Disconnected.');
            flutterClients.delete(ws);
        });

    } else {
        // Reject unknown connections
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