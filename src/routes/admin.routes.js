const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middlewares/auth.middlewares');
const adminController = require('../controllers/admin.controller');

router.use(verifyToken, isAdmin);

router.post('/invites', adminController.createInvite);
router.get('/invites', adminController.listInvites);
router.delete('/invites/:id', adminController.deleteInvite);

module.exports = router;
