const express = require('express');
const router = express.Router();
const callController = require('../controllers/callController');

// Route 1: You call this from Postman to start everything
router.post('/call', callController.initiateCall);

// Route 2: Twilio calls this when you answer the phone. 
// IF THIS IS MISSING, YOU GET A 404.
router.post('/twiml', callController.generateTwiml);

module.exports = router;