const express = require('express');
const router = express.Router();

const clienteController = require('../controllers/cliente.controller');
const { validateSchema } = require('../middleware/validate.middleware');
const { createClienteSchema, updateClienteSchema } = require('../schemas/cliente.schema');

// GET /api/clientes - Obtener todos los clientes del usuario
router.get('/', clienteController.getClientes);

// GET /api/clientes/:id - Obtener un cliente por ID
router.get('/:id', clienteController.getClienteById);

// POST /api/clientes - Crear un nuevo cliente
router.post('/', validateSchema(createClienteSchema), clienteController.createCliente);

// PUT /api/clientes/:id - Actualizar un cliente existente
router.put('/:id', validateSchema(updateClienteSchema), clienteController.updateCliente);

// DELETE /api/clientes/:id - Eliminar un cliente
router.delete('/:id', clienteController.deleteCliente);

module.exports = router;
