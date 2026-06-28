const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { optionalAuth } = require('../middlewares/auth.middlewares');

router.post('/create-intent', optionalAuth, paymentController.createPaymentIntent);

module.exports = router;
