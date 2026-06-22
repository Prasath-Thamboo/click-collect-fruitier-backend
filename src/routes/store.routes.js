const express = require('express');
const router = express.Router();
const storeController = require('../controllers/store.controller');
const { verifyToken, isManagerOrAdmin, isAdmin, optionalAuth } = require('../middlewares/auth.middlewares');

router.get('/', optionalAuth, storeController.getStores);
router.get('/:id', storeController.getStore);
router.post('/', verifyToken, isAdmin, storeController.createStore);
router.put('/:id', verifyToken, isAdmin, storeController.updateStore);
router.delete('/:id', verifyToken, isAdmin, storeController.deleteStore);

module.exports = router;
