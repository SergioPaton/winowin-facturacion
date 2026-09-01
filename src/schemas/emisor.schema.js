const Joi = require('joi');

// Esquema de validación para el perfil de emisor
const emisorSchema = Joi.object({
    // Datos básicos de la empresa
    nombre: Joi.string().required().min(2).max(100).messages({
        'string.empty': 'El nombre de la empresa es obligatorio',
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres'
    }),
    
    nif: Joi.string().required().pattern(/^[A-Z0-9-]{8,12}[A-Z]?$/i).messages({
        'string.empty': 'El NIF es obligatorio',
        'string.pattern.base': 'El formato del NIF no es válido'
    }),
    
    // Información fiscal
    regimenFiscal: Joi.string().required().valid(
        '01', // Régimen General
        '02', // Régimen Simplificado
        '03', // Régimen de Agricultura, Ganadería y Pesca
        '04', // Régimen de Recargo de Equivalencia
        '05', // Régimen de Bienes Usados
        '06', // Régimen de Agencias de Viajes
        '07', // Régimen de Agrupación de Interés Económico
        '08', // Régimen Especial de Taquillas
        '09', // Régimen Especial de Entidades de Servicios de Pago
        '10', // Régimen Especial del Oro de Inversión
        '11', // Régimen Especial de Servicios de Telecomunicaciones
        '12', // Régimen Especial de Servicios de Electricidad
        '13', // Régimen Especial de Servicios de Gas
        '14', // Régimen Especial de Servicios de Agua
        '15', // Régimen Especial de Entidades de Derecho Público
        '16'  // Otros regímenes
    ).messages({
        'any.only': 'El régimen fiscal seleccionado no es válido'
    }),
    
    // Dirección fiscal
    direccion: Joi.string().required().min(5).max(200).messages({
        'string.empty': 'La dirección es obligatoria',
        'string.min': 'La dirección debe tener al menos 5 caracteres'
    }),
    
    ciudad: Joi.string().required().min(2).max(50).messages({
        'string.empty': 'La ciudad es obligatoria',
        'string.min': 'La ciudad debe tener al menos 2 caracteres'
    }),
    
    provincia: Joi.string().required().min(2).max(50).messages({
        'string.empty': 'La provincia es obligatoria'
    }),
    
    cp: Joi.string().required().pattern(/^\d{5}$/).messages({
        'string.empty': 'El código postal es obligatorio',
        'string.pattern.base': 'El código postal debe tener 5 dígitos'
    }),
    
    pais: Joi.string().required().default('ES').messages({
        'string.empty': 'El país es obligatorio'
    }),
    
    // Contacto
    telefono: Joi.string().max(50).optional().messages({
        'string.max': 'El teléfono no puede exceder 50 caracteres'
    }),
    
    email: Joi.string().email().optional().messages({
        'string.email': 'El formato del email no es válido'
    }),
    
    web: Joi.string().uri().optional().messages({
        'string.uri': 'El formato de la web no es válido'
    }),
    
    // Datos Veri*factu
    sifNombre: Joi.string().required().default('Win o Win Facturación').messages({
        'string.empty': 'El nombre del software es obligatorio'
    }),
    
    sifVersion: Joi.string().required().default('1.0.0').messages({
        'string.empty': 'La versión del software es obligatoria'
    }),
    
    sifNif: Joi.string().required().pattern(/^[A-Z0-9-]{8,12}[A-Z]?$/i).messages({
        'string.empty': 'El NIF del desarrollador es obligatorio',
        'string.pattern.base': 'El formato del NIF del desarrollador no es válido'
    }),
    
    // Campos adicionales del productor según RD 1007/2023
    productorNombre: Joi.string().optional().min(2).max(100).messages({
        'string.min': 'El nombre del productor debe tener al menos 2 caracteres',
        'string.max': 'El nombre del productor no puede exceder 100 caracteres'
    }),
    
    productorDireccion: Joi.string().optional().min(5).max(200).messages({
        'string.min': 'La dirección del productor debe tener al menos 5 caracteres',
        'string.max': 'La dirección del productor no puede exceder 200 caracteres'
    }),
    
    productorLocalidad: Joi.string().optional().min(2).max(50).messages({
        'string.min': 'La localidad del productor debe tener al menos 2 caracteres',
        'string.max': 'La localidad del productor no puede exceder 50 caracteres'
    }),
    
    productorProvincia: Joi.string().optional().min(2).max(50).messages({
        'string.min': 'La provincia del productor debe tener al menos 2 caracteres',
        'string.max': 'La provincia del productor no puede exceder 50 caracteres'
    }),
    
    productorCp: Joi.string().optional().pattern(/^\d{5}$/).messages({
        'string.pattern.base': 'El código postal del productor debe tener 5 dígitos'
    }),
    
    productorPais: Joi.string().optional().default('España').max(50).messages({
        'string.max': 'El país del productor no puede exceder 50 caracteres'
    }),
    
    productorEmail: Joi.string().email().optional().messages({
        'string.email': 'El formato del email del productor no es válido'
    }),
    
    productorTelefono: Joi.string().pattern(/^\+?\d{9,15}$/).optional().messages({
        'string.pattern.base': 'El formato del teléfono del productor no es válido'
    }),
    
    // Opciones de facturación
    ivaPorDefecto: Joi.number().min(0).max(100).optional().default(21).messages({
        'number.min': 'El IVA no puede ser negativo',
        'number.max': 'El IVA no puede exceder 100'
    }),
    
    metodoPagoPorDefecto: Joi.string().optional().valid(
        '01', // Efectivo
        '02', // Transferencia
        '03', // Tarjeta
        '04', // Domiciliación
        '05'  // Otros
    ).default('02').messages({
        'any.only': 'El método de pago seleccionado no es válido'
    }),
    
    // Configuración de envío
    emailEnvioPorDefecto: Joi.boolean().optional().default(false),
    emailPlantilla: Joi.string().optional(),
    
    // Configuración de firma
    certificadoPath: Joi.string().optional(),
    certificadoPassword: Joi.string().optional(),
    
    // Configuración de backup
    backupAutomatico: Joi.boolean().optional().default(true),
    backupPath: Joi.string().optional(),
    backupFrecuencia: Joi.string().optional().valid('diario', 'semanal', 'mensual').default('semanal'),
    
    // Información adicional
    observacionesPorDefecto: Joi.string().optional().max(500),
    pieDePagina: Joi.string().optional().max(200),
    
    // Estado
    activo: Joi.boolean().optional().default(true),
    
    // Timestamps
    createdAt: Joi.date().optional(),
    updatedAt: Joi.date().optional()
});

// Opciones de validación
const emisorValidationOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
};

module.exports = {
    emisorSchema,
    emisorValidationOptions
};
