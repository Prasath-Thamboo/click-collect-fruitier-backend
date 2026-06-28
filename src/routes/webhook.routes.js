const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Raw body required for Stripe signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), webhookController.handleStripeWebhook);

module.exports = router;
