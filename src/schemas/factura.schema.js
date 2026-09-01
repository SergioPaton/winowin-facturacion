const { z } = require('zod');

const facturaLineaSchema = z.object({
    descripcion: z.string({
        required_error: "La descripción es requerida",
        invalid_type_error: "La descripción debe ser un texto",
    }).min(1, { message: "La descripción no puede estar vacía" }),
    cantidad: z.number({
        required_error: "La cantidad es requerida",
        invalid_type_error: "La cantidad debe ser un número",
    }).int().positive({ message: "La cantidad debe ser mayor a 0" }),
    precioUnitario: z.number({
        required_error: "El precio unitario es requerido",
        invalid_type_error: "El precio unitario debe ser un número",
    }).positive({ message: "El precio unitario debe ser mayor a 0" }),
    tipoIva: z.number({
        invalid_type_error: "El tipo de IVA debe ser un número",
    }).min(0).max(100).default(21),
});

const createFacturaSchema = z.object({
    clienteId: z.number({
        required_error: "El ID del cliente es requerido",
        invalid_type_error: "El ID del cliente debe ser un número",
    }).int().positive(),
    lineas: z.array(facturaLineaSchema, {
        required_error: "Debe haber al menos una línea de factura"
    }).nonempty({ message: "Debe haber al menos una línea de factura" }),
    notas: z.string().optional(),
    descuento: z.number().optional(),
    metodoPago: z.string().optional(),
    pagada: z.boolean().optional().default(false),
    importePagado: z.number().optional().default(0),
});

module.exports = {
    createFacturaSchema
};