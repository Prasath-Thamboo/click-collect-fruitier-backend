const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const { verifyToken, isManagerOrAdmin, optionalAuth } = require('../middlewares/auth.middlewares');

router.get('/', optionalAuth, productController.getProducts);
router.get('/:id', productController.getProduct);
router.post('/', verifyToken, isManagerOrAdmin, productController.createProduct);
router.put('/:id', verifyToken, isManagerOrAdmin, productController.updateProduct);
router.delete('/:id', verifyToken, isManagerOrAdmin, productController.deleteProduct);

module.exports = router;
