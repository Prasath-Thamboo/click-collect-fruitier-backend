const express = require('express');
const router = express.Router();
const orderController = require('../controllers/order.controller');
const { verifyToken, isManagerOrAdmin } = require('../middlewares/auth.middlewares');

router.get('/', verifyToken, orderController.getOrders);
router.get('/:id', verifyToken, orderController.getOrder);
router.post('/', verifyToken, orderController.createOrder);
router.put('/:id/status', verifyToken, isManagerOrAdmin, orderController.updateOrderStatus);
router.delete('/:id', verifyToken, orderController.cancelOrder);

module.exports = router;
