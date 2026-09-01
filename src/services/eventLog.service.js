const crypto = require('crypto');
const db = require('../config/db');

/**
 * Servicio para el Registro de Eventos (Audit Log)
 * Requisito legal de Veri*Factu (RD 1007/2023)
 */
class EventLogService {
    /**
     * Registra un evento en la base de datos con encadenamiento de hash
     * @param {string} tipo - Tipo de evento (ALTA, BAJA, MODIFICACION, INICIO, CIERRE, BACKUP, ERROR)
     * @param {string} descripcion - Descripción legible del evento
     * @param {Object} datos - Datos adicionales del evento (opcional)
     * @param {number} usuarioId - ID del usuario que generó el evento (opcional)
     */
    async log(tipo, descripcion, datos = null, usuarioId = null) {
        try {
            // 1. Obtener el último evento para el encadenamiento
            const ultimoEvento = await db.prisma.eventoLog.findFirst({
                orderBy: { id: 'desc' }
            });

            const hashAnterior = ultimoEvento ? ultimoEvento.hashActual : "0".repeat(64);
            const fechaHora = new Date();

            // 2. Calcular el hash de este evento
            const datosString = datos ? JSON.stringify(datos) : "";
            const cadenaParaHash = 
                fechaHora.toISOString() + 
                tipo + 
                descripcion + 
                datosString + 
                (usuarioId || "") + 
                hashAnterior;

            const hashActual = crypto.createHash('sha256')
                .update(cadenaParaHash)
                .digest('hex');

            // 3. Crear el evento con los hashes
            const nuevoEvento = await db.prisma.eventoLog.create({
                data: {
                    fechaHora,
                    tipo,
                    descripcion,
                    datos: datosString || null,
                    usuarioId: usuarioId ? Number(usuarioId) : null,
                    hashAnterior,
                    hashActual
                }
            });

            console.log(`[EVENT LOG] ${tipo}: ${descripcion} (Hash: ${hashActual.substring(0, 8)}...)`);
            return nuevoEvento;
        } catch (error) {
            console.error('Error al registrar evento en el log:', error);
        }
    }

    /**
     * Verifica la integridad de la cadena de logs
     * @returns {Promise<Object>} - Resultado de la auditoría
     */
    async verifyLogIntegrity() {
        try {
            const eventos = await db.prisma.eventoLog.findMany({
                orderBy: { id: 'asc' }
            });

            let hashEsperadoAnterior = "0".repeat(64);
            const errores = [];

            for (const evento of eventos) {
                // Verificar hashAnterior
                if (evento.hashAnterior !== hashEsperadoAnterior) {
                    errores.push(`Rotura de cadena en ID ${evento.id}: hashAnterior no coincide.`);
                }

                // Recalcular hashActual
                const cadenaParaHash = 
                    new Date(evento.fechaHora).toISOString() + 
                    evento.tipo + 
                    evento.descripcion + 
                    (evento.datos || "") + 
                    (evento.usuarioId || "") + 
                    evento.hashAnterior;

                const hashCalculado = crypto.createHash('sha256')
                    .update(cadenaParaHash)
                    .digest('hex');

                if (evento.hashActual !== hashCalculado) {
                    errores.push(`Alteración de datos en ID ${evento.id}: hashActual no coincide.`);
                }

                hashEsperadoAnterior = evento.hashActual;
            }

            return {
                valido: errores.length === 0,
                totalEventos: eventos.length,
                errores
            };
        } catch (error) {
            console.error('Error verificando integridad del log:', error);
            return { valido: false, error: error.message };
        }
    }

    /**
     * Obtiene los últimos eventos del log
     * @param {number} limit - Número máximo de eventos a recuperar
     */
    async getRecentEvents(limit = 50) {
        try {
            return await db.prisma.eventoLog.findMany({
                take: limit,
                orderBy: { fechaHora: 'desc' }
            });
        } catch (error) {
            console.error('Error obteniendo eventos del log:', error);
            return [];
        }
    }
}

module.exports = new EventLogService();
