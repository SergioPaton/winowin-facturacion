const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../config/db');

// ─── Cifrado AES-256-GCM ──────────────────────────────────────────────────────
const ALGORITHM = 'aes-256-gcm';
const KEY_LEN = 32;

/**
 * Deriva una clave de 32 bytes desde APP_SECRET usando SHA-256.
 */
function _getKey() {
    const secret = process.env.APP_SECRET || 'winowin-default-secret-change-me';
    return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Cifra un texto plano. Devuelve string base64: iv:authTag:ciphertext
 */
function encryptSmtpPass(plainText) {
    const key = _getKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Descifra un texto cifrado con encryptSmtpPass.
 */
function decryptSmtpPass(encryptedText) {
    try {
        const [ivHex, authTagHex, cipherHex] = encryptedText.split(':');
        const key = _getKey();
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const cipherText = Buffer.from(cipherHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(authTag);
        return decipher.update(cipherText, undefined, 'utf8') + decipher.final('utf8');
    } catch (e) {
        console.error('Error descifrando contraseña SMTP:', e.message);
        return null;
    }
}

// ─── Crear transporter ────────────────────────────────────────────────────────

/**
 * Crea un transporter Nodemailer basándose en los datos del emisor activo.
 * Si el emisor no tiene configuración SMTP, cae en modo Ethereal (prueba).
 */
async function _createTransporter() {
    // 1. Leer emisor activo
    let smtpConfig = null;
    try {
        const emisor = await db.prisma.emisor.findFirst({ where: { activo: true } });
        if (emisor?.smtpHost && emisor?.smtpUser && emisor?.smtpPass) {
            smtpConfig = {
                host: emisor.smtpHost,
                port: emisor.smtpPort || 587,
                secure: emisor.smtpSecure || false,
                user: emisor.smtpUser,
                pass: decryptSmtpPass(emisor.smtpPass),
                fromName: emisor.smtpFromName || emisor.nombre
            };
        }
    } catch (e) {
        console.warn('No se pudo leer la config SMTP del emisor:', e.message);
    }

    // 2. Si hay config real → usarla
    if (smtpConfig?.pass) {
        return {
            isTest: false,
            fromAddress: `"${smtpConfig.fromName}" <${smtpConfig.user}>`,
            transporter: nodemailer.createTransport({
                host: smtpConfig.host,
                port: smtpConfig.port,
                secure: smtpConfig.secure,
                auth: { user: smtpConfig.user, pass: smtpConfig.pass }
            })
        };
    }

    // 3. Fallback → Ethereal (prueba)
    // También comprobar variables de entorno como segunda opción
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        return {
            isTest: false,
            fromAddress: `"Facturación VeriFactu" <${process.env.SMTP_USER}>`,
            transporter: nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_PORT == 465,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
            })
        };
    }

    const testAccount = await nodemailer.createTestAccount();
    console.log(`ℹ️ Usando cuenta de prueba Ethereal: ${testAccount.user}`);
    return {
        isTest: true,
        fromAddress: `"Win o Win Facturación" <no-reply@winowin.com>`,
        transporter: nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        })
    };
}

// ─── API Pública ──────────────────────────────────────────────────────────────

/**
 * Envía un correo electrónico con adjuntos.
 * @param {{ to: string, subject: string, html: string, attachments?: Array }} param0
 */
const sendEmail = async ({ to, subject, html, attachments }) => {
    const { transporter, fromAddress, isTest } = await _createTransporter();

    const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        html,
        attachments
    });

    console.log('✅ Correo enviado: %s', info.messageId);
    if (isTest) {
        console.log('🔗 URL de previsualización: %s', nodemailer.getTestMessageUrl(info));
    }

    return { messageId: info.messageId, previewUrl: isTest ? nodemailer.getTestMessageUrl(info) : null };
};

/**
 * Prueba una configuración SMTP sin guardarla en la BD.
 * @param {{ host: string, port: number, user: string, pass: string, secure: boolean }} config
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
const testSmtpConnection = async ({ host, port, user, pass, secure }) => {
    try {
        const transporter = nodemailer.createTransport({
            host,
            port: parseInt(port) || 587,
            secure: secure || false,
            auth: { user, pass }
        });
        await transporter.verify();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
};

/**
 * Infiere la configuración SMTP basada en el dominio del correo electrónico.
 */
const resolveSmtpSettings = (email) => {
    if (!email || !email.includes('@')) return null;
    const domain = email.split('@')[1].toLowerCase();

    const providers = {
        'gmail.com': { host: 'smtp.gmail.com', port: 587, secure: false },
        'outlook.com': { host: 'smtp-mail.outlook.com', port: 587, secure: false },
        'hotmail.com': { host: 'smtp-mail.outlook.com', port: 587, secure: false },
        'live.com': { host: 'smtp-mail.outlook.com', port: 587, secure: false },
        'yahoo.com': { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
        'yahoo.es': { host: 'smtp.mail.yahoo.com', port: 465, secure: true },
        'icloud.com': { host: 'smtp.mail.me.com', port: 587, secure: false },
        'me.com': { host: 'smtp.mail.me.com', port: 587, secure: false },
        'mac.com': { host: 'smtp.mail.me.com', port: 587, secure: false },
        'movistar.es': { host: 'smtp.movistar.es', port: 465, secure: true },
        'telefonica.net': { host: 'smtp.movistar.es', port: 465, secure: true },
        'orange.es': { host: 'smtp.orange.es', port: 465, secure: true }
    };

    return providers[domain] || null;
};

module.exports = { sendEmail, encryptSmtpPass, decryptSmtpPass, testSmtpConnection, resolveSmtpSettings };
