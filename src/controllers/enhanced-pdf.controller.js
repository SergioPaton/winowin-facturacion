const enhancedPDFService = require('../services/enhanced-pdf.service');
const fs = require('fs');
const path = require('path');
const { shell, dialog } = require('electron');

/**
 * Controlador para PDFs Mejorados con Integración Nativa de Electron
 */
class EnhancedPDFController {
    /**
     * Genera un PDF mejorado con opciones avanzadas
     */
    async generateEnhancedPDF(req) {
        try {
            const { facturaId, options = {} } = req.body;
            
            // Obtener datos de la factura
            const factura = await this._getInvoiceData(facturaId);
            
            // Generar PDF con opciones
            const result = await enhancedPDFService.generateEnhancedPDF(factura, options);
            
            return {
                success: true,
                buffer: result.buffer,
                metadata: result.metadata
            };
            
        } catch (error) {
            console.error('Error generando PDF mejorado:', error);
            throw new Error(`Error generando PDF: ${error.message}`);
        }
    }

    /**
     * Previsualiza PDF en ventana nativa
     */
    async previewPDF(req) {
        try {
            const { facturaId, options = {} } = req.body;
            
            // Obtener datos de la factura
            const factura = await this._getInvoiceData(facturaId);
            
            // Generar previsualización
            const preview = await enhancedPDFService.previewPDF(factura, options);
            
            // Abrir con visor PDF por defecto
            await shell.openPath(preview.tempPath);
            
            return {
                success: true,
                tempPath: preview.tempPath,
                metadata: preview.metadata
            };
            
        } catch (error) {
            console.error('Error en previsualización PDF:', error);
            throw new Error(`Error en previsualización: ${error.message}`);
        }
    }

    /**
     * Guarda PDF con diálogo nativo
     */
    async savePDF(req) {
        try {
            const { facturaId, options = {} } = req.body;
            
            // Obtener datos de la factura
            const factura = await this._getInvoiceData(facturaId);
            
            // Generar PDF
            const result = await enhancedPDFService.generateEnhancedPDF(factura, options);
            
            // Diálogo para guardar archivo
            const saveDialog = await dialog.showSaveDialog({
                title: 'Guardar Factura PDF',
                defaultPath: `factura_${factura.numero.replace(/\//g, '_')}.pdf`,
                filters: [
                    { name: 'PDF Documents', extensions: ['pdf'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });
            
            if (saveDialog.canceled) {
                return { success: false, message: 'Operación cancelada por el usuario' };
            }
            
            // Guardar archivo
            fs.writeFileSync(saveDialog.filePath, result.buffer);
            
            // Opción para abrir automáticamente
            const shouldOpen = await dialog.showMessageBox({
                type: 'question',
                buttons: ['Sí', 'No'],
                defaultId: 0,
                title: 'PDF Guardado',
                message: 'El PDF se ha guardado correctamente',
                detail: '¿Deseas abrir el archivo ahora?'
            });
            
            if (shouldOpen.response === 0) {
                await shell.openPath(saveDialog.filePath);
            }
            
            return {
                success: true,
                filePath: saveDialog.filePath,
                metadata: result.metadata
            };
            
        } catch (error) {
            console.error('Error guardando PDF:', error);
            throw new Error(`Error guardando PDF: ${error.message}`);
        }
    }

    /**
     * Imprime PDF directamente
     */
    async printPDF(req) {
        try {
            const { facturaId, options = {} } = req.body;
            
            // Obtener datos de la factura
            const factura = await this._getInvoiceData(facturaId);
            
            // Generar PDF con calidad de impresión
            const printOptions = { ...options, quality: 'print' };
            const result = await enhancedPDFService.generateEnhancedPDF(factura, printOptions);
            
            // Guardar temporalmente para impresión
            const tempPath = path.join(require('os').tmpdir(), `print_${Date.now()}.pdf`);
            fs.writeFileSync(tempPath, result.buffer);
            
            // Abrir diálogo de impresión
            await shell.openExternal(`file://${tempPath}`);
            
            // Limpiar archivo temporal después de un tiempo
            setTimeout(() => {
                try {
                    fs.unlinkSync(tempPath);
                } catch (error) {
                    console.warn('Error limpiando archivo temporal:', error.message);
                }
            }, 30000); // 30 segundos
            
            return {
                success: true,
                tempPath,
                message: 'Diálogo de impresión abierto'
            };
            
        } catch (error) {
            console.error('Error imprimiendo PDF:', error);
            throw new Error(`Error en impresión: ${error.message}`);
        }
    }

    /**
     * Genera PDF con marca de agua (copias)
     */
    async generateWatermarkedPDF(req) {
        try {
            const { facturaId, watermarkText = 'COPIA - NO VÁLIDO' } = req.body;
            
            // Obtener datos de la factura
            const factura = await this._getInvoiceData(facturaId);
            
            // Generar PDF con watermark
            const options = {
                includeWatermark: true,
                quality: 'standard'
            };
            
            const result = await enhancedPDFService.generateEnhancedPDF(factura, options);
            
            return {
                success: true,
                buffer: result.buffer,
                metadata: result.metadata
            };
            
        } catch (error) {
            console.error('Error generando PDF con watermark:', error);
            throw new Error(`Error generando copia: ${error.message}`);
        }
    }

    /**
     * Obtiene lista de logos disponibles
     */
    getAvailableLogos() {
        try {
            const logos = enhancedPDFService.getAvailableLogos();
            
            return {
                success: true,
                logos: logos.map(logo => ({
                    name: logo.name,
                    type: logo.type,
                    size: logo.size,
                    sizeFormatted: this._formatFileSize(logo.size)
                }))
            };
            
        } catch (error) {
            console.error('Error obteniendo logos:', error);
            throw new Error(`Error obteniendo logos: ${error.message}`);
        }
    }

    /**
     * Genera lote de PDFs
     */
    async generateBatchPDFs(req) {
        try {
            const { facturaIds, options = {} } = req.body;
            
            if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
                throw new Error('Se requiere una lista válida de IDs de factura');
            }
            
            const results = [];
            
            for (const facturaId of facturaIds) {
                try {
                    const factura = await this._getInvoiceData(facturaId);
                    const result = await enhancedPDFService.generateEnhancedPDF(factura, options);
                    
                    results.push({
                        facturaId,
                        facturaNumero: factura.numero,
                        success: true,
                        buffer: result.buffer,
                        metadata: result.metadata
                    });
                    
                } catch (error) {
                    results.push({
                        facturaId,
                        success: false,
                        error: error.message
                    });
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            
            return {
                success: true,
                total: facturaIds.length,
                successCount,
                errorCount: facturaIds.length - successCount,
                results
            };
            
        } catch (error) {
            console.error('Error generando lote de PDFs:', error);
            throw new Error(`Error en lote: ${error.message}`);
        }
    }

    /**
     * Obtiene datos de factura desde base de datos
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
     * Formatea tamaño de archivo
     * @private
     */
    _formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

module.exports = new EnhancedPDFController();
