const informeService = require('../services/informe.service');

/**
 * Controlador para la gestión de informes fiscales.
 */
const getIVASummary = async (year) => {
    try {
        const summary = await informeService.getIVASummary(Number(year));
        return summary;
    } catch (error) {
        console.error('Error en getIVASummary controller:', error);
        throw new Error(error.message || "Error al generar el resumen de IVA");
    }
};

module.exports = {
    getIVASummary
};
