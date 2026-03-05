const twilio = require('twilio');
const VoiceResponse = require('twilio').twiml.VoiceResponse;

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// --- 1. INITIATE CALL (Triggered by You) ---
exports.initiateCall = async (req, res) => {
    try {
        const { agentNumber, customerNumber } = req.body;
        
        // HARDCODE URL FOR TESTING (As discussed)
        const ngrokUrl = "https://concavely-inflationary-eddy.ngrok-free.dev"; 
        
        // This is the URL Twilio will hit when you answer
        const callbackUrl = `${ngrokUrl}/api/twiml?customerNumber=${encodeURIComponent(customerNumber)}`;

        console.log(`[CallController] Calling Agent: ${agentNumber}`);
        console.log(`[CallController] Callback URL will be: ${callbackUrl}`);

        const call = await client.calls.create({
            to: agentNumber,
            from: process.env.TWILIO_PHONE_NUMBER,
            url: callbackUrl, // Twilio hits this when you pickup
        });

        return res.status(200).json({ callSid: call.sid });

    } catch (error) {
        console.error("Error starting call:", error);
        return res.status(500).json({ error: error.message });
    }
};

// --- 2. GENERATE TWIML (Triggered by Twilio) ---
exports.generateTwiml = (req, res) => {
    // Note: This function must be synchronous (no 'async') usually, 
    // unless you are looking up data.
    console.log("[CallController] Twilio has hit /api/twiml endpoint!");

    const customerNumber = req.query.customerNumber;
    
    // Hardcode here too just to be safe for now
    const ngrokUrl = "https://concavely-inflationary-eddy.ngrok-free.dev"; 
    
    // Prepare the WebSocket URL (wss://)
    // We replace 'https' with 'wss'
    const wsUrl = ngrokUrl.replace("https://", "wss://") + "/stream";

    console.log(`[CallController] Connecting to Stream: ${wsUrl}`);
    console.log(`[CallController] Dialing Customer: ${customerNumber}`);

    const response = new VoiceResponse();

    // 1. Start Streaming
    const start = response.start();
    start.stream({
        url: wsUrl,
        track: 'both_tracks'
    });

    // 2. Dial the Customer
    const dial = response.dial({
        callerId: process.env.TWILIO_PHONE_NUMBER, 
    });
    dial.number(customerNumber);

    // 3. Send XML back to Twilio
    res.type('text/xml');
    res.send(response.toString());
};