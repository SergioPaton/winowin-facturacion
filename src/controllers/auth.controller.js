const db = require('../config/db');
const { config } = require('../config/config');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const emailService = require('../services/email.service');

/**
 * Verifica si existe algún usuario configurado con contraseña.
 */
const checkSetup = async () => {
    try {
        const user = await db.prisma.usuario.findFirst({
            where: { passwordHash: { not: null } }
        });
        return !!user;
    } catch (error) {
        console.error("Error checkSetup:", error);
        throw new Error("Error verificando estado de configuración");
    }
};

/**
 * Configura las credenciales iniciales. Solo permite ejecutarse si no hay setup previo.
 */
const setupAuth = async (data) => {
    try {
        const isSetup = await checkSetup();
        if (isSetup) {
            throw new Error("El sistema ya ha sido configurado previamente.");
        }

        const { username, password, recoveryEmail } = data;
        if (!username || !password) throw new Error("Usuario y contraseña son obligatorios");

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Verificamos si existe algún usuario (creado por sync de API vieja o sin credenciales)
        const existingUser = await db.prisma.usuario.findFirst();

        if (existingUser) {
            // Actualizamos
            await db.prisma.usuario.update({
                where: { id: existingUser.id },
                data: { username, passwordHash, recoveryEmail }
            });
        } else {
            // Creamos un dummy local asumiendo que el usuario añadirá datos luego
            await db.prisma.usuario.create({
                data: {
                    nombre: username,
                    apellido: "",
                    telefono: 0,
                    nif: `temp-${Date.now()}`,
                    direccion: "A rellenar",
                    email: recoveryEmail || `temp-${Date.now()}@example.com`,
                    username,
                    passwordHash,
                    recoveryEmail
                }
            });
        }
        return true;
    } catch (error) {
        console.error("Error setupAuth:", error);
        throw new Error(error.message || "Error configurando credenciales");
    }
};

/**
 * Inicia sesión verificando credenciales.
 * Retorna usuario con timestamp de login para control de sesión.
 */
const login = async (username, password) => {
    try {
        const user = await db.prisma.usuario.findUnique({
            where: { username }
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            throw new Error("Credenciales inválidas");
        }

        // Devolvemos el perfil seguro con timestamp de login
        const { passwordHash, recoveryCode, recoveryCodeExpires, ...safeUser } = user;
        return {
            ...safeUser,
            loginTimestamp: new Date().toISOString(),
            sessionDuration: config.session.duration
        };
    } catch (error) {
        console.error("Error login:", error);
        throw new Error(error.message || "Error al iniciar sesión");
    }
};

/**
 * Solicita recuperar contraseña enviando un código de 6 dígitos al correo configurado.
 */
const requestPasswordRecovery = async (username) => {
    try {
        const user = await db.prisma.usuario.findUnique({ where: { username } });
        if (!user || !user.recoveryEmail) {
            throw new Error("Usuario no encontrado o no tiene correo de recuperación.");
        }

        // Generar código de 6 dígitos
        const code = crypto.randomInt(100000, 999999).toString();
        const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await db.prisma.usuario.update({
            where: { id: user.id },
            data: { recoveryCode: code, recoveryCodeExpires: expires }
        });

        // Enviar correo
        const html = `
            <h2>Recuperación de Contraseña</h2>
            <p>Has solicitado recuperar tu contraseña local para Win o Win Facturación.</p>
            <p>Tu código de seguridad es: <strong>${code}</strong></p>
            <p>Este código expira en 15 minutos. Si no fuiste tú, ignora este correo.</p>
        `;
        const info = await emailService.sendEmail({
            to: user.recoveryEmail,
            subject: "Código de recuperación de Win o Win Facturación",
            html
        });
        
        let previewUrl = null;
        if (!process.env.SMTP_USER || process.env.SMTP_USER === 'test@example.com') {
            const nodemailer = require('nodemailer');
            previewUrl = nodemailer.getTestMessageUrl(info);
        }

        return { success: true, previewUrl, emailHint: user.recoveryEmail.replace(/^(.)(.*)(.@.*)$/, (_, a, b, c) => a + b.replace(/./g, '*') + c) };
    } catch (error) {
        console.error("Error request recovery:", error);
        throw new Error(error.message || "Error al solicitar recuperación");
    }
};

/**
 * Verifica si el código introducido es correcto y no ha expirado.
 */
const verifyRecoveryCode = async (username, code) => {
    try {
        const user = await db.prisma.usuario.findUnique({ where: { username } });
        if (!user || !user.recoveryCode || user.recoveryCode !== code) {
            throw new Error("Código incorrecto o inválido");
        }
        if (new Date() > user.recoveryCodeExpires) {
            throw new Error("El código ha expirado. Solicita uno nuevo.");
        }
        return true;
    } catch (error) {
        console.error("Error verify code:", error);
        throw new Error(error.message || "Error al verificar código");
    }
};

/**
 * Establece la nueva contraseña tras verificar el código.
 */
const resetPassword = async (username, code, newPassword) => {
    try {
        // Doble validación por seguridad
        await verifyRecoveryCode(username, code);

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        await db.prisma.usuario.update({
            where: { username },
            data: { 
                passwordHash,
                recoveryCode: null,
                recoveryCodeExpires: null
            }
        });
        return true;
    } catch (error) {
        console.error("Error reset password:", error);
        throw new Error(error.message || "Error al restablecer contraseña");
    }
};

module.exports = {
    checkSetup,
    setupAuth,
    login,
    requestPasswordRecovery,
    verifyRecoveryCode,
    resetPassword
};
