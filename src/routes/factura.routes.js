const express = require('express');
const router = express.Router();

const facturaController = require('../controllers/factura.controller');
const { validateSchema } = require('../middleware/validate.middleware');
const { createFacturaSchema } = require('../schemas/factura.schema');

// GET /api/facturas - Obtener todas las facturas
router.get('/', facturaController.getFacturas);

// GET /api/facturas/:id - Obtener una factura específica
router.get('/:id', facturaController.getFacturaById);

// POST /api/facturas - Generar una nueva factura
router.post('/', validateSchema(createFacturaSchema), facturaController.createFactura);

// GET /api/facturas/:id/pdf - Descargar factura en formato PDF
// router.get('/:id/pdf', facturaController.downloadFacturaPDF);

module.exports = router;
