const express = require('express');
const router = express.Router();
const { register, login, me, changePassword } = require('./auth.controller');
const { authenticate } = require('../../shared/middleware/auth');
router.post('/register', register);
router.post('/login', login);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);
module.exports = router;
