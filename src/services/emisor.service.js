const db = require('../config/db');
const { emisorSchema, emisorValidationOptions } = require('../schemas/emisor.schema');

class EmisorService {
    /**
     * Obtiene el perfil del emisor activo
     * @returns {Promise<Object|null>} Perfil del emisor o null si no existe
     */
    async getEmisorActivo() {
        try {
            const emisor = await db.prisma.emisor.findFirst({
                where: { activo: true },
                include: { series: true }
            });
            
            return emisor;
        } catch (error) {
            console.error('Error obteniendo emisor activo:', error);
            throw new Error('Error al obtener el perfil del emisor');
        }
    }

    /**
     * Obtiene todos los perfiles de emisor
     * @returns {Promise<Array>} Lista de emisores
     */
    async getAllEmisores() {
        try {
            const emisores = await db.prisma.emisor.findMany({
                orderBy: { createdAt: 'desc' }
            });
            
            return emisores;
        } catch (error) {
            console.error('Error obteniendo emisores:', error);
            throw new Error('Error al obtener los perfiles de emisor');
        }
    }

    /**
     * Obtiene un emisor por ID
     * @param {number} id - ID del emisor
     * @returns {Promise<Object|null>} Emisor encontrado o null
     */
    async getEmisorById(id) {
        if (!id || id === 'undefined' || id === 'null') return null;
        
        const emisorId = Number(id);
        if (isNaN(emisorId)) return null;

        try {
            const emisor = await db.prisma.emisor.findUnique({
                where: { id: emisorId }
            });
            
            return emisor;
        } catch (error) {
            console.error('Error obteniendo emisor por ID:', error);
            throw new Error('Error al obtener el perfil del emisor');
        }
    }

    /**
     * Crea un nuevo perfil de emisor
     * @param {Object} emisorData - Datos del emisor
     * @returns {Promise<Object>} Emisor creado
     */
    async createEmisor(emisorData) {
        try {
            // Validar datos
            const { error, value } = emisorSchema.validate(emisorData, emisorValidationOptions);
            
            if (error) {
                const validationErrors = error.details.map(detail => detail.message);
                throw new Error(`Validación fallida: ${validationErrors.join(', ')}`);
            }

            // Si ya existe un emisor activo, desactivarlo
            await this._desactivarOtrosEmisores();

            // Crear nuevo emisor
            const nuevoEmisor = await db.prisma.emisor.create({
                data: {
                    ...value,
                    activo: true
                }
            });

            return nuevoEmisor;
        } catch (error) {
            console.error('Error creando emisor:', error);
            throw new Error(`Error creando perfil de emisor: ${error.message}`);
        }
    }

    /**
     * Actualiza un perfil de emisor existente
     * @param {number} id - ID del emisor
     * @param {Object} emisorData - Datos actualizados
     * @returns {Promise<Object>} Emisor actualizado
     */
    async updateEmisor(id, emisorData) {
        try {
            // Validar datos
            const { error, value } = emisorSchema.validate(emisorData, emisorValidationOptions);
            
            if (error) {
                const validationErrors = error.details.map(detail => detail.message);
                throw new Error(`Validación fallida: ${validationErrors.join(', ')}`);
            }

            // Si se está activando este emisor, desactivar los demás
            if (value.activo) {
                await this._desactivarOtrosEmisores(id);
            }

            const emisorActualizado = await db.prisma.emisor.update({
                where: { id: Number(id) },
                data: {
                    ...value,
                    updatedAt: new Date()
                }
            });

            return emisorActualizado;
        } catch (error) {
            console.error('Error actualizando emisor:', error);
            throw new Error(`Error actualizando perfil de emisor: ${error.message}`);
        }
    }

    /**
     * Elimina un perfil de emisor
     * @param {number} id - ID del emisor
     * @returns {Promise<Object>} Emisor eliminado
     */
    async deleteEmisor(id) {
        try {
            // Por ahora, omitimos la verificación de facturas asociadas
            // ya que la columna emisorId podría no existir en todas las instalaciones
            const emisorEliminado = await db.prisma.emisor.delete({
                where: { id: Number(id) }
            });

            return emisorEliminado;
        } catch (error) {
            console.error('Error eliminando emisor:', error);
            throw new Error(`Error eliminando perfil de emisor: ${error.message}`);
        }
    }

    /**
     * Activa un perfil de emisor y desactiva los demás
     * @param {number} id - ID del emisor a activar
     * @returns {Promise<Object>} Emisor activado
     */
    async activateEmisor(id) {
        try {
            // Desactivar todos los demás emisores
            await this._desactivarOtrosEmisores(id);

            // Activar el emisor solicitado
            const emisorActivado = await db.prisma.emisor.update({
                where: { id: Number(id) },
                data: { 
                    activo: true,
                    updatedAt: new Date()
                }
            });

            return emisorActivado;
        } catch (error) {
            console.error('Error activando emisor:', error);
            throw new Error(`Error activando perfil de emisor: ${error.message}`);
        }
    }

    /**
     * Obtiene el siguiente número de factura para el emisor activo
     * @returns {Promise<Object>} Siguiente número y prefijo
     */
    async getSiguienteNumeroFactura(serieId = null) {
        try {
            const emisor = await this.getEmisorActivo();
            if (!emisor) throw new Error('No hay un perfil de emisor activo');

            let serie;
            if (serieId) {
                serie = await db.prisma.serie.findUnique({ where: { id: Number(serieId) } });
            } else {
                serie = await db.prisma.serie.findFirst({ 
                    where: { emisorId: emisor.id, tipo: 'ORDINARIA', activo: true },
                    orderBy: { createdAt: 'asc' }
                });
            }

            if (!serie) {
                // Si no hay series, intentar migrar o crear una por defecto
                await this.migrarContadoresASeries(emisor.id);
                return this.getSiguienteNumeroFactura(serieId);
            }
            
            return {
                numero: serie.proximoNumero,
                prefijo: serie.prefijo,
                serieId: serie.id,
                serieNombre: serie.nombre,
                numeroCompleto: `${serie.prefijo}${String(serie.proximoNumero).padStart(5, '0')}`
            };
        } catch (error) {
            console.error('Error obteniendo siguiente número de factura:', error);
            throw new Error('Error al obtener el siguiente número de factura');
        }
    }

    /**
     * Migra los contadores antiguos del emisor a la nueva tabla de series
     * @param {number} emisorId - ID del emisor
     */
    async migrarContadoresASeries(emisorId) {
        try {
            const emisor = await db.prisma.emisor.findUnique({ where: { id: emisorId } });
            if (!emisor) return;

            const countSeries = await db.prisma.serie.count({ where: { emisorId } });
            if (countSeries > 0) return; // Ya migrado

            console.log(`[MIGRACIÓN] Migrando contadores del emisor ${emisorId} a series...`);

            // Usamos valores por defecto si los campos legacy no están disponibles
            const prefijoFactura = emisor.prefijoFactura || 'F';
            const proximoNumeroFactura = emisor.proximoNumeroFactura || 1;
            const prefijoRectificativa = emisor.prefijoRectificativa || 'R';
            const proximoNumeroRectificativa = emisor.proximoNumeroRectificativa || 1;

            await db.prisma.serie.createMany({
                data: [
                    {
                        nombre: 'Serie Ordinaria',
                        prefijo: prefijoFactura,
                        proximoNumero: proximoNumeroFactura,
                        tipo: 'ORDINARIA',
                        emisorId: emisorId
                    },
                    {
                        nombre: 'Serie Rectificativa',
                        prefijo: prefijoRectificativa,
                        proximoNumero: proximoNumeroRectificativa,
                        tipo: 'RECTIFICATIVA',
                        emisorId: emisorId
                    }
                ]
            });
        } catch (error) {
            console.error('[MIGRACIÓN] Error migrando contadores:', error);
        }
    }

    /**
     * Incrementa el contador de facturas del emisor activo
     * @returns {Promise<void>}
     */
    async incrementarContadorFactura(serieId) {
        try {
            const serie = await db.prisma.serie.findUnique({ where: { id: Number(serieId) } });
            if (!serie) throw new Error('Serie no encontrada para incrementar contador');

            await db.prisma.serie.update({
                where: { id: serie.id },
                data: { 
                    proximoNumero: serie.proximoNumero + 1,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Error incrementando contador de factura:', error);
            throw new Error('Error al incrementar el contador de facturas');
        }
    }

    /**
     * Obtiene los datos fiscales para Veri*factu del emisor activo
     * @returns {Promise<Object>} Datos fiscales del emisor
     */
    async getDatosFiscalesVerifactu() {
        try {
            const emisor = await this.getEmisorActivo();
            
            if (!emisor) {
                throw new Error('No hay un perfil de emisor activo configurado');
            }

            return {
                emisor: {
                    nombre: emisor.nombre,
                    nif: emisor.nif,
                    direccion: emisor.direccion,
                    cp: emisor.cp,
                    ciudad: emisor.ciudad,
                    provincia: emisor.provincia,
                    pais: emisor.pais
                },
                regimenFiscal: emisor.regimenFiscal,
                sif: {
                    nombre: emisor.sifNombre,
                    version: emisor.sifVersion,
                    nif: emisor.sifNif
                }
            };
        } catch (error) {
            console.error('Error obteniendo datos fiscales Veri*factu:', error);
            throw new Error('Error al obtener los datos fiscales para Veri*factu');
        }
    }

    /**
     * Inicializa el emisor por defecto si no existe ninguno
     * @returns {Promise<Object|null>} Emisor creado o null si ya existe
     */
    async inicializarEmisorPorDefecto() {
        try {
            const emisoresCount = await db.prisma.emisor.count();
            
            if (emisoresCount === 0) {
                const emisorPorDefecto = await this.createEmisor({
                    nombre: 'Hermanos Gómez Win S.L.',
                    nif: 'B75700476',
                    regimenFiscal: '01',
                    direccion: 'C/ Islas Galápagos, 36 Bajo',
                    ciudad: 'Aranjuez',
                    provincia: 'Madrid',
                    cp: '28300',
                    pais: 'ES',
                    telefono: '+34 698 764 889 /+34 637 572 723',
                    email: 'winowinconsulting@gmail.com',
                    web: 'https://www.winowin.consulting',
                    ivaPorDefecto: 21,
                    metodoPagoPorDefecto: '02',
                    sifNombre: 'Win o Win Facturación',
                    sifVersion: '1.0.0',
                    sifNif: 'B75700476', // CIF del emisor como responsable por defecto
                    activo: true
                });

                console.log('Emisor por defecto creado:', emisorPorDefecto.nombre);
                return emisorPorDefecto;
            }

            return null;
        } catch (error) {
            console.error('Error inicializando emisor por defecto:', error);
            throw error;
        }
    }

    /**
     * Desactiva todos los emisores excepto el especificado
     * @private
     */
    async _desactivarOtrosEmisores(exceptoId = null) {
        const whereClause = exceptoId 
            ? { activo: true, id: { not: Number(exceptoId) } }
            : { activo: true };

        await db.prisma.emisor.updateMany({
            where: whereClause,
            data: { activo: false }
        });
    }

    /**
     * Verifica si existe un emisor activo
     * @returns {Promise<boolean>} True si hay un emisor activo
     */
    async existeEmisorActivo() {
        try {
            const count = await db.prisma.emisor.count({
                where: { activo: true }
            });
            
            return count > 0;
        } catch (error) {
            console.error('Error verificando emisor activo:', error);
            return false;
        }
    }
}

module.exports = new EmisorService();
