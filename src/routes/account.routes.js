const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middlewares');
const accountController = require('../controllers/account.controller');

router.use(verifyToken);

router.get('/', accountController.getAccount);
router.put('/password', accountController.changePassword);
router.put('/email', accountController.changeEmail);
router.get('/export', accountController.exportData);
router.delete('/', accountController.deleteAccount);

module.exports = router;
