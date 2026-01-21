const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middlewares/rateLimiter');
const { register, login } = require('../controllers/authController');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

module.exports = router;