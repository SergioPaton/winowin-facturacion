const emisorService = require('../services/emisor.service');

class EmisorController {
    /**
     * Obtiene el perfil del emisor activo
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Perfil del emisor activo
     */
    async getEmisorActivo(req) {
        try {
            const emisor = await emisorService.getEmisorActivo();
            
            if (!emisor) {
                return {
                    success: false,
                    message: 'No hay un perfil de emisor activo configurado',
                    data: null
                };
            }

            return {
                success: true,
                message: 'Perfil de emisor obtenido correctamente',
                data: emisor
            };
        } catch (error) {
            console.error('Error en getEmisorActivo:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Obtiene todos los perfiles de emisor
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Lista de emisores
     */
    async getAllEmisores(req) {
        try {
            const emisores = await emisorService.getAllEmisores();
            
            return {
                success: true,
                message: 'Perfiles de emisor obtenidos correctamente',
                data: emisores
            };
        } catch (error) {
            console.error('Error en getAllEmisores:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Obtiene un emisor por ID
     * @param {Object} req - Objeto de solicitud con params.id
     * @returns {Promise<Object>} Emisor encontrado
     */
    async getEmisorById(req) {
        try {
            const { id } = req.params;
            const emisor = await emisorService.getEmisorById(id);
            
            if (!emisor) {
                return {
                    success: false,
                    message: 'Perfil de emisor no encontrado',
                    data: null
                };
            }

            return {
                success: true,
                message: 'Perfil de emisor obtenido correctamente',
                data: emisor
            };
        } catch (error) {
            console.error('Error en getEmisorById:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Crea un nuevo perfil de emisor
     * @param {Object} req - Objeto de solicitud con body
     * @returns {Promise<Object>} Emisor creado
     */
    async createEmisor(req) {
        try {
            const emisorData = req.body;
            const nuevoEmisor = await emisorService.createEmisor(emisorData);
            
            return {
                success: true,
                message: 'Perfil de emisor creado correctamente',
                data: nuevoEmisor
            };
        } catch (error) {
            console.error('Error en createEmisor:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Actualiza un perfil de emisor existente
     * @param {Object} req - Objeto de solicitud con params.id y body
     * @returns {Promise<Object>} Emisor actualizado
     */
    async updateEmisor(req) {
        try {
            const { id } = req.params;
            const emisorData = req.body;
            
            // Si se actualiza emailEnvioPorDefecto a true, verificar configuración SMTP
            if (emisorData.emailEnvioPorDefecto && !process.env.SMTP_USER) {
                throw new Error('Para activar el envío de correos, primero debe configurar las credenciales SMTP en el archivo .env');
            }
            
            const emisorActualizado = await emisorService.updateEmisor(id, emisorData);
            
            return {
                success: true,
                message: 'Perfil de emisor actualizado correctamente',
                data: emisorActualizado
            };
        } catch (error) {
            console.error('Error en updateEmisor:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Elimina un perfil de emisor
     * @param {Object} req - Objeto de solicitud con params.id
     * @returns {Promise<Object>} Emisor eliminado
     */
    async deleteEmisor(req) {
        try {
            const { id } = req.params;
            const emisorEliminado = await emisorService.deleteEmisor(id);
            
            return {
                success: true,
                message: 'Perfil de emisor eliminado correctamente',
                data: emisorEliminado
            };
        } catch (error) {
            console.error('Error en deleteEmisor:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Activa un perfil de emisor
     * @param {Object} req - Objeto de solicitud con params.id
     * @returns {Promise<Object>} Emisor activado
     */
    async activateEmisor(req) {
        try {
            const { id } = req.params;
            const emisorActivado = await emisorService.activateEmisor(id);
            
            return {
                success: true,
                message: 'Perfil de emisor activado correctamente',
                data: emisorActivado
            };
        } catch (error) {
            console.error('Error en activateEmisor:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Obtiene el siguiente número de factura
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Siguiente número de factura
     */
    async getSiguienteNumeroFactura(req) {
        try {
            const siguienteNumero = await emisorService.getSiguienteNumeroFactura();
            
            return {
                success: true,
                message: 'Siguiente número de factura obtenido correctamente',
                data: siguienteNumero
            };
        } catch (error) {
            console.error('Error en getSiguienteNumeroFactura:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Incrementa el contador de facturas
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Resultado de la operación
     */
    async incrementarContadorFactura(req) {
        try {
            await emisorService.incrementarContadorFactura();
            
            return {
                success: true,
                message: 'Contador de facturas incrementado correctamente',
                data: null
            };
        } catch (error) {
            console.error('Error en incrementarContadorFactura:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Obtiene los datos fiscales para Veri*factu
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Datos fiscales
     */
    async getDatosFiscalesVerifactu(req) {
        try {
            const datosFiscales = await emisorService.getDatosFiscalesVerifactu();
            
            return {
                success: true,
                message: 'Datos fiscales obtenidos correctamente',
                data: datosFiscales
            };
        } catch (error) {
            console.error('Error en getDatosFiscalesVerifactu:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Inicializa el emisor por defecto si no existe
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Resultado de la inicialización
     */
    async inicializarEmisorPorDefecto(req) {
        try {
            const emisorPorDefecto = await emisorService.inicializarEmisorPorDefecto();
            
            if (emisorPorDefecto) {
                return {
                    success: true,
                    message: 'Emisor por defecto inicializado correctamente',
                    data: emisorPorDefecto
                };
            } else {
                return {
                    success: true,
                    message: 'Ya existe al menos un perfil de emisor',
                    data: null
                };
            }
        } catch (error) {
            console.error('Error en inicializarEmisorPorDefecto:', error);
            throw error;
        }
    }

    /**
     * Verifica si existe un emisor activo
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Resultado de la verificación
     */
    async existeEmisorActivo(req) {
        try {
            const existe = await emisorService.existeEmisorActivo();
            
            return {
                success: true,
                message: 'Verificación completada',
                data: { existeEmisorActivo: existe }
            };
        } catch (error) {
            console.error('Error en existeEmisorActivo:', error);
            throw new Error(error.message);
        }
    }

    /**
     * Obtiene opciones para formularios (regímenes fiscales, métodos de pago, etc.)
     * @param {Object} req - Objeto de solicitud
     * @returns {Promise<Object>} Opciones para formularios
     */
    async getOpcionesFormulario(req) {
        try {
            const opciones = {
                regimenesFiscales: [
                    { value: '01', label: '01 - Régimen General' },
                    { value: '02', label: '02 - Exportación' },
                    { value: '03', label: '03 - REBU (Bienes usados, arte, objetos de colección)' },
                    { value: '04', label: '04 - Régimen especial del Oro de Inversión' },
                    { value: '05', label: '05 - Régimen especial de las Agencias de Viajes' },
                    { value: '07', label: '07 - Régimen especial del Criterio de Caja' },
                    { value: '08', label: '08 - Operaciones sujetas al IPSI / IGIC (Ceuta, Melilla, Canarias)' },
                    { value: '11', label: '11 - Arrendamiento de local de negocio (Sujeto a retención)' },
                    { value: '14', label: '14 - Factura con IVA pendiente de devengo (Administración Pública)' },
                    { value: '15', label: '15 - Factura con IVA pendiente de devengo (Tracto sucesivo)' },
                    { value: '16', label: '16 - Otros regímenes especiales' }
                ],
                metodosPago: [
                    { value: '01', label: 'Efectivo' },
                    { value: '02', label: 'Transferencia' },
                    { value: '03', label: 'Tarjeta' },
                    { value: '04', label: 'Domiciliación' },
                    { value: '05', label: 'Otros' }
                ],
                frecuenciasBackup: [
                    { value: 'diario', label: 'Diario' },
                    { value: 'semanal', label: 'Semanal' },
                    { value: 'mensual', label: 'Mensual' }
                ]
            };

            return {
                success: true,
                message: 'Opciones de formulario obtenidas correctamente',
                data: opciones
            };
        } catch (error) {
            console.error('Error en getOpcionesFormulario:', error);
            throw new Error(error.message);
        }
    }
}

module.exports = new EmisorController();
