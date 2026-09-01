const { z } = require('zod');

const createClienteSchema = z.object({
    nombre: z.string({
        required_error: "El nombre es requerido",
        invalid_type_error: "El nombre debe ser un texto",
    }).min(1, { message: "El nombre no puede estar vacío" }),
    nif: z.string({
        required_error: "El NIF es requerido",
        invalid_type_error: "El NIF debe ser un texto",
    }).min(9, { message: "El NIF debe tener al menos 9 caracteres" }),
    direccion: z.string({
        invalid_type_error: "La dirección debe ser un texto",
    }).optional(),
    direccionEntrega: z.string().optional(),
    email: z.string().email({ message: "Formato de email inválido" }).optional().or(z.literal("")),
});

const updateClienteSchema = createClienteSchema.partial();

module.exports = {
    createClienteSchema,
    updateClienteSchema,
};
