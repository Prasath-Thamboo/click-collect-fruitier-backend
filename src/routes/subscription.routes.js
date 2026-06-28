const express = require('express');
const router = express.Router();
const subController = require('../controllers/subscription.controller');
const { verifyToken } = require('../middlewares/auth.middlewares');

router.get('/', verifyToken, subController.getSubscriptions);
router.post('/create-intent', verifyToken, subController.createSubscriptionIntent);
router.post('/confirm', verifyToken, subController.confirmSubscription);
router.delete('/:id', verifyToken, subController.cancelSubscription);

module.exports = router;
