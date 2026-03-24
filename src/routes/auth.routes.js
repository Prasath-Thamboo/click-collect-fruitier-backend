const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Ces routes seront préfixées par /api/auth (défini dans index.js)
router.post('/register', authController.register);
router.post('/login', authController.login);

module.exports = router;