/**
 * Configuración para el cumplimiento del Reglamento VeriFactu.
 */
module.exports = {
    // Flag para pruebas sin certificado o sin conexión real a AEAT
    TEST_MODE: process.env.VERIFACTU_TEST_MODE === 'true' || true, // Por defecto true para facilitar pruebas iniciales

    // Datos del Responsable del Sistema Informático (Productor del Software SIF)
    SIF: {
        NOMBRE: "Sistema de Facturación Win o Win",
        VERSION: "1.0.0",
        NIF: "B75700476" // Este NIF debe ser el del responsable legal del software (la empresa en modo in-house)
    },

    // Endpoints de la AEAT (VeriFactu)
    AEAT: {
        // En un entorno real, estas URLs se obtendrían de la documentación oficial de la AEAT
        ENDPOINT_VERIFACTU: process.env.AEAT_VERIFACTU_URL || "https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/ssii/fact/ws/VeriFactu.wsdl",
        URL_COTEJO: "https://www2.agenciatributaria.gob.es/wlpl/AVS1-VERI/VerificacionFactura"
    }
};
