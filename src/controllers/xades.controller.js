const xadesService = require('../services/xades.service');
const path = require('path');
const fs = require('fs');

/**
 * Controlador para operaciones de firma digital XAdES
 */
class XadesController {
    /**
     * Firma una factura con XAdES-EPES
     * @param {Object} req - Request object con datos de firma
     * @returns {Object} Resultado de la firma
     */
    async signInvoice(req) {
        try {
            const { 
                facturaId, 
                certPath, 
                certPassword, 
                outputDir 
            } = req.body;

            // Validaciones de seguridad
            this._validateSignRequest({ facturaId, certPath, certPassword });

            // Obtener información de la factura
            const factura = await this._getInvoiceData(facturaId);
            
            // Generar rutas de archivos
            const xmlPath = await this._generateInvoiceXML(factura);
            const outputPath = path.join(outputDir || process.env.TEMP_DIR, `factura_${factura.numero}_signed.xml`);

            // Realizar la firma
            const result = await xadesService.signInvoice(
                xmlPath, 
                certPath, 
                certPassword, 
                outputPath
            );

            // Limpiar archivo temporal
            this._cleanupTempFile(xmlPath);

            // Actualizar registro en base de datos
            await this._updateInvoiceSignature(facturaId, {
                xmlFirmadoPath: outputPath,
                xmlFirmado: fs.readFileSync(outputPath, 'utf8'),
                fechaHoraHitoGen: new Date().toISOString(),
                hashActual: this._calculateFileHash(outputPath)
            });

            return {
                success: true,
                facturaId,
                firmaPath: outputPath,
                signatureInfo: result.signatureInfo
            };

        } catch (error) {
            console.error('Error en firma XAdES:', error);
            throw new Error(`Error en firma digital: ${error.message}`);
        }
    }

    /**
     * Valida una firma XAdES
     * @param {Object} req - Request con path del XML firmado
     * @returns {Object} Resultado de validación
     */
    async validateSignature(req) {
        try {
            const { xmlPath } = req.body;

            if (!fs.existsSync(xmlPath)) {
                throw new Error('Archivo XML firmado no encontrado');
            }

            const xmlContent = fs.readFileSync(xmlPath, 'utf8');
            
            // Validación básica de estructura XAdES
            const validation = this._validateXadesStructure(xmlContent);

            return {
                valid: validation.isValid,
                details: validation.details,
                signatureInfo: validation.signatureInfo
            };

        } catch (error) {
            throw new Error(`Error en validación: ${error.message}`);
        }
    }

    /**
     * Verifica la integridad de una factura firmada
     * @param {Object} req - Request con datos de verificación
     * @returns {Object} Resultado de verificación
     */
    async verifyInvoiceIntegrity(req) {
        try {
            const { facturaId } = req.body;

            const factura = await this._getInvoiceData(facturaId);
            
            if (!factura.xmlFirmadoPath || !factura.hashActual) {
                throw new Error('La factura no tiene firma digital registrada');
            }

            // Calcular hash actual del archivo
            const currentHash = this._calculateFileHash(factura.xmlFirmadoPath);
            
            // Comparar hashes
            const integrityValid = currentHash === factura.hashActual;

            return {
                facturaId,
                integrityValid,
                storedHash: factura.hashActual,
                currentHash,
                lastModified: fs.statSync(factura.xmlFirmadoPath).mtime
            };

        } catch (error) {
            throw new Error(`Error en verificación de integridad: ${error.message}`);
        }
    }

    /**
     * Valida los parámetros de solicitud de firma
     * @private
     */
    _validateSignRequest({ facturaId, certPath, certPassword }) {
        if (!facturaId || isNaN(facturaId)) {
            throw new Error('ID de factura inválido');
        }

        if (!certPath || !fs.existsSync(certPath)) {
            throw new Error('Ruta del certificado inválida o archivo no encontrado');
        }

        if (!certPassword || certPassword.length < 1) {
            throw new Error('La contraseña del certificado es requerida');
        }

        // Validar extensión del certificado
        const certExt = path.extname(certPath).toLowerCase();
        if (!['.p12', '.pfx'].includes(certExt)) {
            throw new Error('El certificado debe estar en formato .p12 o .pfx');
        }
    }

    /**
     * Obtiene datos de la factura desde base de datos
     * @private
     */
    async _getInvoiceData(facturaId) {
        const db = require('../config/db');
        
        const factura = await db.prisma.factura.findUnique({
            where: { id: Number(facturaId) },
            include: { 
                cliente: true,
                facturalinea: true
            }
        });

        if (!factura) {
            throw new Error('Factura no encontrada');
        }

        return factura;
    }

    /**
     * Genera el XML de la factura para firmar
     * @private
     */
    async _generateInvoiceXML(factura) {
        const facturaService = require('./factura.service');
        
        // Generar XML temporal
        const tempDir = process.env.TEMP_DIR || require('os').tmpdir();
        const xmlPath = path.join(tempDir, `temp_factura_${factura.id}_${Date.now()}.xml`);
        
        // Usar el servicio existente para generar XML
        const xmlContent = await facturaService.generateFacturaXML(factura);
        fs.writeFileSync(xmlPath, xmlContent);
        
        return xmlPath;
    }

    /**
     * Limpia archivo temporal
     * @private
     */
    _cleanupTempFile(filePath) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.warn('Error limpiando archivo temporal:', error.message);
        }
    }

    /**
     * Actualiza registro de firma en base de datos
     * @private
     */
    async _updateInvoiceSignature(facturaId, signatureData) {
        const db = require('../config/db');
        
        await db.prisma.factura.update({
            where: { id: Number(facturaId) },
            data: signatureData
        });
    }

    /**
     * Calcula hash SHA-256 de archivo
     * @private
     */
    _calculateFileHash(filePath) {
        const crypto = require('crypto');
        const fileBuffer = fs.readFileSync(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    }

    /**
     * Valida estructura XAdES básica
     * @private
     */
    _validateXadesStructure(xmlContent) {
        const validation = {
            isValid: false,
            details: [],
            signatureInfo: {}
        };

        try {
            // Validar elementos requeridos XAdES
            const requiredElements = [
                'ds:Signature',
                'ds:SignedInfo',
                'ds:SignatureValue',
                'ds:KeyInfo',
                'xades:SignedProperties',
                'xades:SigningTime',
                'xades:SigningCertificate',
                'xades:SignaturePolicyIdentifier'
            ];

            for (const element of requiredElements) {
                if (xmlContent.includes(element)) {
                    validation.details.push(`✓ ${element} encontrado`);
                } else {
                    validation.details.push(`✗ ${element} no encontrado`);
                }
            }

            // Validar política de firma
            if (xmlContent.includes('http://www.facturae.es/politicas_de_firma')) {
                validation.details.push('✓ Política de firma FacturaE detectada');
                validation.isValid = true;
            } else {
                validation.details.push('✗ Política de firma no detectada');
            }

            // Extraer información básica de la firma
            const signingTimeMatch = xmlContent.match(/<xades:SigningTime>(.*?)<\/xades:SigningTime>/);
            if (signingTimeMatch) {
                validation.signatureInfo.signingTime = signingTimeMatch[1];
            }

        } catch (error) {
            validation.details.push(`Error en validación: ${error.message}`);
        }

        return validation;
    }
}

module.exports = new XadesController();
