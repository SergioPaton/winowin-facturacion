const db = require('../config/db');

const profileSelect = {
    id: true,
    nombre: true,
    apellido: true,
    telefono: true,
    nif: true,
    direccion: true,
    email: true,
    nombreComercial: true,
    prefijoFactura: true,
    siguienteNumero: true,
    ivaDefecto: true,
    irpfDefecto: true,
    verifactuEnabled: true,
    nombreMarca: true,
    logoPath: true,
    website: true,
    cuentaBancaria: true,
    certPath: true,
    createdAt: true,
    updatedAt: true
};

const getProfile = async () => {
    try {
        const profile = await db.prisma.usuario.findFirst({
            orderBy: { id: 'asc' },
            select: profileSelect
        });

        if (!profile) {
            throw new Error("Perfil local no configurado");
        }

        return profile;
    } catch (error) {
        console.error(error);
        if (error.message === "Perfil local no configurado") throw error;
        throw new Error("Error interno del servidor");
    }
};

const updateProfile = async (data) => {
    try {
        const existingProfile = await db.prisma.usuario.findFirst({
            orderBy: { id: 'asc' },
            select: { id: true }
        });

        const {
            nombre, apellido, telefono, nif, direccion, email, nombreComercial, prefijoFactura,
            siguienteNumero, ivaDefecto, irpfDefecto, verifactuEnabled, nombreMarca,
            logoPath, website, cuentaBancaria, certPath
        } = data;

        const payload = {
            nombre, apellido, telefono, nif, direccion, email, nombreComercial, prefijoFactura,
            siguienteNumero, ivaDefecto, irpfDefecto, verifactuEnabled, nombreMarca,
            logoPath, website, cuentaBancaria, certPath
        };

        const cleanPayload = Object.fromEntries(
            Object.entries(payload).filter(([, value]) => value !== undefined)
        );

        let profile;
        if (!existingProfile) {
            profile = await db.prisma.usuario.create({
                data: cleanPayload,
                select: profileSelect
            });
        } else {
            profile = await db.prisma.usuario.update({
                where: { id: existingProfile.id },
                data: cleanPayload,
                select: profileSelect
            });
        }

        return profile;
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') {
            throw new Error("NIF o email ya existe");
        }
        throw new Error("Error interno del servidor");
    }
};

module.exports = {
    getProfile,
    updateProfile
};