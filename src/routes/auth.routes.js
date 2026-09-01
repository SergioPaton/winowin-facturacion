const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');

// Endpoint legacy: mantiene compatibilidad para clientes antiguos.
router.post('/login', authController.login);

module.exports = router;
