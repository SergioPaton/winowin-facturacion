const db = require('../config/db');

const getClientes = async () => {
    return await db.prisma.cliente.findMany({
        orderBy: { nombre: 'asc' }
    });
};

const getClienteById = async (id) => {
    const cliente = await db.prisma.cliente.findUnique({
        where: { id: Number(id) }
    });
    if (!cliente) throw new Error("Cliente no encontrado");
    return cliente;
};

const createCliente = async (data) => {
    try {
        const { 
            tipoCliente, nombre, razonSocial, nif, 
            direccion, codigoPostal, ciudad, provincia, pais,
            email, telefono, direccionEntrega, observaciones 
        } = data;
        return await db.prisma.cliente.create({
            data: { 
                tipoCliente: tipoCliente || 'EMPRESA',
                nombre, razonSocial, nif, 
                direccion, codigoPostal, ciudad, provincia, pais: pais || 'España',
                email, telefono, direccionEntrega, observaciones 
            }
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2002') throw new Error("Ya tienes un cliente registrado con ese NIF");
        throw new Error("Error al crear cliente");
    }
};

const updateCliente = async (id, data) => {
    try {
        const { 
            tipoCliente, nombre, razonSocial, nif, 
            direccion, codigoPostal, ciudad, provincia, pais,
            email, telefono, direccionEntrega, observaciones 
        } = data;
        return await db.prisma.cliente.update({
            where: { id: Number(id) },
            data: { 
                tipoCliente, nombre, razonSocial, nif,
                direccion, codigoPostal, ciudad, provincia, pais,
                email, telefono, direccionEntrega, observaciones 
            }
        });
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') throw new Error("Cliente no encontrado");
        throw new Error("Error al actualizar cliente");
    }
};

const deleteCliente = async (id) => {
    try {
        await db.prisma.cliente.delete({
            where: { id: Number(id) }
        });
        return true;
    } catch (error) {
        console.error(error);
        if (error.code === 'P2025') throw new Error("Cliente no encontrado");
        if (error.code === 'P2003') throw new Error("No se puede eliminar el cliente porque tiene facturas asociadas");
        throw new Error("Error al eliminar cliente");
    }
};

module.exports = {
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente
};
