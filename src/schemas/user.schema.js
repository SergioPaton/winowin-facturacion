const { z } = require('zod');

const baseProfileSchema = z.object({
    nombre: z.string({
        required_error: "El nombre es requerido",
        invalid_type_error: "El nombre debe ser un texto",
    }).min(1, { message: "El nombre no puede estar vacío" }),
    apellido: z.string({
        required_error: "El apellido es requerido",
        invalid_type_error: "El apellido debe ser un texto",
    }).min(1, { message: "El apellido no puede estar vacío" }),
    telefono: z.number({
        required_error: "El teléfono es requerido",
        invalid_type_error: "El teléfono debe ser un número",
    }),
    nif: z.string({
        required_error: "El NIF/CIF es requerido",
        invalid_type_error: "El NIF debe ser un texto",
    }).min(1, { message: "El NIF no puede estar vacío" }),
    email: z.string({
        required_error: "El email es requerido",
        invalid_type_error: "El email debe ser un texto",
    }).email({ message: "Formato de email inválido" }),
    direccion: z.string({
        required_error: "La direccion es requerida",
        invalid_type_error: "La direccion debe ser un texto"
    }).min(1, { message: "La direccion no puede estar vacia" }),
    nombreComercial: z.string({
        required_error: "El nombre comercial es requerido",
        invalid_type_error: "El nombre debe ser un texto",
    }).min(1, { message: "El nombre no puede estar vacío" }),
    prefijoFactura: z.string({
        invalid_type_error: "Formato de prefijo invalido"
    }).default("FACT-"),
    siguienteNumero: z.number().int().positive().default(1),
    ivaDefecto: z.number().min(0).max(100).default(21),
    irpfDefecto: z.number().min(0).max(100).optional(),
    verifactuEnabled: z.boolean().default(false),
    nombreMarca: z.string().optional(),
    logoPath: z.string().optional(),
    website: z.string().url({ message: "Formato de URL inválido" }).optional().or(z.literal("")),
    cuentaBancaria: z.string().optional(),
    certPath: z.string().optional()
});

const updateProfileSchema = baseProfileSchema.partial();

module.exports = {
    updateProfileSchema
};