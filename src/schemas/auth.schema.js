const { z } = require('zod');

const loginSchema = z.object({
    email: z.string({
        required_error: "El email es requerido",
    }).email({ message: "Formato de email inválido" }),
    password: z.string({
        required_error: "La contraseña es requerida",
    }).min(6, { message: "La contraseña debe tener al menos 6 caracteres" }),
});

module.exports = {
    loginSchema,
};
