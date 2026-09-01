const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Funciones auxiliares para dibujar secciones
 */
function drawSection(doc, title, y, colors, fonts) {
    doc.fontSize(fonts.subheader.size)
       .fillColor(colors.accent)
       .text(title, 50, y, { bold: true });
    
    doc.strokeColor(colors.border)
       .lineWidth(1)
       .moveTo(50, doc.y + 5)
       .lineTo(550, doc.y + 5)
       .stroke();
}

function drawSignatureSection(doc, factura, y, colors, fonts) {
    drawSection(doc, 'Firma Digital VeriFactu', y, colors, fonts);
    
    doc.fontSize(fonts.small.size)
       .fillColor(colors.success)
       .text('✓ Esta factura está firmada digitalmente', 50, doc.y + 5)
       .fillColor(colors.secondary)
       .text(`Algoritmo: RSA-SHA256`, 50, doc.y + 10)
       .text(`Fecha de firma: ${factura.fechaHoraHitoGen ? new Date(factura.fechaHoraHitoGen).toLocaleString('es-ES') : 'N/A'}`, 50, doc.y + 10)
       .text(`Huella: ${factura.hashActual ? factura.hashActual.substring(0, 20) + '...' : 'N/A'}`, 50, doc.y + 10);
}

function drawFooter(doc, factura, colors, fonts) {
    const footerY = doc.page.height - 80;
    
    doc.fontSize(fonts.tiny.size)
       .fillColor(colors.light)
       .text('─'.repeat(100), 50, footerY, { align: 'center' })
       .fillColor(colors.secondary)
       .text('DATOS VERIFACTU', 50, footerY + 15, { bold: true })
       .text('Esta factura ha sido generada por un sistema informático conforme al Reglamento de Facturación Electrónica (VeriFactu).', { width: 450 })
       .text(`Huella SHA-256: ${factura.hashActual || 'N/A'}`)
       .text(`Encadenamiento Anterior: ${factura.hashCadenaAnterior || 'Registro Inicial'}`)
       .text(`Software: ${factura.sifNombre || 'Win o Win Facturación'} v${factura.sifVersion || '1.0'} | NIF Desarrollador: ${factura.sifNif || 'N/A'}`);
}

/**
 * Servicio Mejorado de PDF con Integración Nativa de Electron
 * Soporte para logos, previsualización, guardado e impresión directa
 */
class EnhancedPDFService {
    constructor() {
        this.logoCache = new Map();
        this.defaultLogoPath = path.join(__dirname, '../../logos');
        this.availableLogos = this.loadAvailableLogos();
    }

    /**
     * Carga los logos disponibles en la carpeta logos
     * @returns {Array} Array de objetos con información de logos
     */
    loadAvailableLogos() {
        try {
            const logos = [];
            const logoFiles = fs.readdirSync(this.defaultLogoPath);
            
            logoFiles.forEach(file => {
                const filePath = path.join(this.defaultLogoPath, file);
                const stats = fs.statSync(filePath);
                
                if (stats.isFile() && /\.(png|jpg|jpeg|gif)$/i.test(file)) {
                    logos.push({
                        name: file,
                        path: filePath,
                        type: path.extname(file).toLowerCase(),
                        size: stats.size
                    });
                }
            });
            
            return logos;
        } catch (error) {
            console.warn('Error cargando logos:', error.message);
            return [];
        }
    }

    /**
     * Carga un logo específico en caché
     * @param {string} logoName - Nombre del archivo de logo
     * @returns {Buffer} Buffer del logo
     */
    loadLogo(logoName) {
        if (this.logoCache.has(logoName)) {
            return this.logoCache.get(logoName);
        }

        const logo = this.availableLogos.find(l => l.name === logoName);
        if (!logo) {
            console.warn(`Logo no encontrado: ${logoName}`);
            return null;
        }

        try {
            const logoBuffer = fs.readFileSync(logo.path);
            this.logoCache.set(logoName, logoBuffer);
            return logoBuffer;
        } catch (error) {
            console.error(`Error cargando logo ${logoName}:`, error.message);
            return null;
        }
    }

    /**
     * Genera un PDF de factura con opciones avanzadas
     * @param {Object} factura - Datos de la factura
     * @param {Object} options - Opciones de generación
     * @returns {Object} Resultado con buffer y metadatos
     */
    async generateEnhancedPDF(factura, options = {}) {
        const {
            logoName = null,
            includeWatermark = false,
            includeSignature = true,
            quality = 'standard', // 'standard', 'high', 'print'
            language = 'es'
        } = options;

        return new Promise((resolve, reject) => {
            try {
                // Configurar PDF según calidad
                const pdfConfig = this.getPDFConfig(quality);
                const doc = new PDFDocument(pdfConfig);
                const chunks = [];

                doc.on('data', (chunk) => chunks.push(chunk));
                doc.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve({
                        buffer,
                        metadata: {
                            filename: `factura_${factura.numero.replace(/\//g, '_')}.pdf`,
                            size: buffer.length,
                            pages: doc.bufferedPageRange().count,
                            logoUsed: logoName,
                            quality,
                            generatedAt: new Date().toISOString()
                        }
                    });
                });
                doc.on('error', (err) => reject(err));

                // Generar contenido con logo
                this.drawEnhancedInvoiceContent(doc, factura, {
                    logo: logoName ? this.loadLogo(logoName) : null,
                    includeWatermark,
                    includeSignature,
                    language
                }).catch(reject);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Obtiene configuración de PDF según calidad
     * @param {string} quality - Nivel de calidad
     * @returns {Object} Configuración PDF
     */
    getPDFConfig(quality) {
        const configs = {
            standard: {
                margin: 50,
                size: 'A4',
                info: {
                    Title: 'Factura Electrónica',
                    Author: 'Win o Win Facturación',
                    Subject: 'Factura VeriFactu',
                    Creator: 'Win o Win Facturación Enhanced PDF Service',
                    Producer: 'PDFKit'
                }
            },
            high: {
                margin: 50,
                size: 'A4',
                compress: false,
                info: {
                    Title: 'Factura Electrónica (Alta Calidad)',
                    Author: 'Win o Win Facturación',
                    Subject: 'Factura VeriFactu - Alta Calidad',
                    Creator: 'Win o Win Facturación Enhanced PDF Service',
                    Producer: 'PDFKit',
                    Keywords: 'factura, verifactu, electronica, pdf'
                }
            },
            print: {
                margin: 40,
                size: 'A4',
                compress: false,
                info: {
                    Title: 'Factura Electrónica (Versión Impresión)',
                    Author: 'Win o Win Facturación',
                    Subject: 'Factura VeriFactu - Versión para Impresión',
                    Creator: 'Win o Win Facturación Enhanced PDF Service',
                    Producer: 'PDFKit'
                }
            }
        };

        return configs[quality] || configs.standard;
    }

    /**
     * Dibuja contenido mejorado de la factura con logo y características avanzadas
     */
    async drawEnhancedInvoiceContent(doc, factura, options = {}) {
        const { logo, includeWatermark, includeSignature, language } = options;
        
        // Parsear datos fiscales
        const datosFiscales = typeof factura.datosFiscales === 'string' 
            ? JSON.parse(factura.datosFiscales) 
            : factura.datosFiscales;

        // Configurar fuentes y colores
        const colors = {
            primary: '#2c3e50',
            secondary: '#34495e',
            accent: '#3498db',
            success: '#27ae60',
            warning: '#f39c12',
            light: '#ecf0f1',
            border: '#bdc3c7'
        };

        const fonts = {
            header: { size: 24, bold: true },
            subheader: { size: 16, bold: true },
            normal: { size: 11 },
            small: { size: 9 },
            tiny: { size: 8 }
        };

        // --- ENCABEZADO CON LOGO ---
        let currentY = 40;
        const leftMargin = 50;
        const rightMargin = 550;
        const contentWidth = 500;

        // Logo (si está disponible)
        if (logo) {
            try {
                doc.image(logo, leftMargin, currentY, { 
                    width: 120, 
                    align: 'left',
                    fit: [120, 80]
                });
            } catch (error) {
                console.warn('Error insertando logo:', error.message);
            }
        }

        // Información de la empresa (alineada a la derecha)
        const companyInfoX = logo ? 400 : leftMargin;
        doc.fontSize(fonts.normal.size)
           .fillColor(colors.primary)
           .text(datosFiscales.emisor.nombre, companyInfoX, currentY, { align: 'right', width: 150 })
           .fontSize(fonts.small.size)
           .fillColor(colors.secondary)
           .text(`NIF: ${datosFiscales.emisor.nif}`, companyInfoX, doc.y, { align: 'right', width: 150 })
           .text(datosFiscales.emisor.direccion, companyInfoX, doc.y, { align: 'right', width: 150 })
           .text(`${datosFiscales.emisor.cp} ${datosFiscales.emisor.ciudad}`, companyInfoX, doc.y, { align: 'right', width: 150 })
           .text(datosFiscales.emisor.provincia, companyInfoX, doc.y, { align: 'right', width: 150 });

        currentY = Math.max(doc.y + 20, 120);

        // --- TÍTULO Y NÚMERO DE FACTURA ---
        doc.fillColor(colors.accent)
           .fontSize(fonts.header.size)
           .text('FACTURA ELECTRÓNICA', leftMargin, currentY, { bold: true });

        doc.fontSize(fonts.subheader.size)
           .fillColor(colors.primary)
           .text(`Nº: ${factura.numero}`, leftMargin, doc.y + 5);

        doc.fontSize(fonts.normal.size)
           .fillColor(colors.secondary)
           .text(`Fecha: ${new Date(factura.fechaEmision).toLocaleDateString('es-ES')}`, 200, doc.y - 20)
           .text(`Estado: ${factura.pagada ? 'PAGADA' : 'PENDIENTE'}`, 350, doc.y - 20);

        currentY = doc.y + 20;

        // --- DATOS DEL CLIENTE ---
        drawSection(doc, 'Datos del Cliente', currentY, colors, fonts);
        currentY = doc.y + 5;

        doc.fontSize(fonts.normal.size)
           .fillColor(colors.primary)
           .text(factura.cliente.nombre, leftMargin, currentY, { bold: true })
           .fontSize(fonts.small.size)
           .fillColor(colors.secondary);

        if (factura.cliente.nif) {
            doc.text(`NIF/CIF: ${factura.cliente.nif}`, leftMargin, doc.y);
        }
        if (factura.cliente.direccion) {
            doc.text(`Dirección: ${factura.cliente.direccion}`, leftMargin, doc.y);
        }
        if (factura.cliente.ciudad) {
            doc.text(`${factura.cliente.cp || ''} ${factura.cliente.ciudad}`, leftMargin, doc.y);
        }

        currentY = doc.y + 20;

        // --- LÍNEAS DE FACTURA ---
        drawSection(doc, 'Conceptos Facturados', currentY, colors, fonts);
        currentY = doc.y + 10;

        // Cabecera de tabla
        const tableTop = currentY;
        const tableHeaders = ['Descripción', 'Cant.', 'Precio', 'IVA', 'Importe'];
        const columnWidths = [250, 50, 70, 50, 80];
        let currentX = leftMargin;

        doc.fillColor(colors.primary);
        tableHeaders.forEach((header, index) => {
            doc.fontSize(fonts.small.size)
               .text(header, currentX, tableTop, { width: columnWidths[index], bold: true });
            currentX += columnWidths[index];
        });

        // Línea separadora
        doc.strokeColor(colors.border)
           .lineWidth(1)
           .moveTo(leftMargin, doc.y + 5)
           .lineTo(rightMargin, doc.y + 5)
           .stroke();

        currentY = doc.y + 15;

        // Líneas de factura
        factura.facturalinea.forEach((linea, index) => {
            const y = currentY + (index * 25);
            
            // Descripción (multilínea si es necesario)
            doc.fontSize(fonts.normal.size)
               .fillColor(colors.primary)
               .text(linea.descripcion, leftMargin, y, { width: columnWidths[0] });
            
            // Cantidad
            doc.text(linea.cantidad.toString(), leftMargin + columnWidths[0], y, { 
                width: columnWidths[1], 
                align: 'center' 
            });
            
            // Precio unitario
            doc.text(`${parseFloat(linea.precioUnitario).toFixed(2)}€`, leftMargin + columnWidths[0] + columnWidths[1], y, { 
                width: columnWidths[2], 
                align: 'right' 
            });
            
            // IVA
            doc.text(`${parseFloat(linea.tipoIva)}%`, leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2], y, { 
                width: columnWidths[3], 
                align: 'center' 
            });
            
            // Importe total línea
            const importeLinea = linea.cantidad * linea.precioUnitario;
            doc.text(`${parseFloat(importeLinea).toFixed(2)}€`, leftMargin + columnWidths[0] + columnWidths[1] + columnWidths[2] + columnWidths[3], y, { 
                width: columnWidths[4], 
                align: 'right',
                bold: true 
            });
        });

        currentY = doc.y + (factura.facturalinea.length * 25) + 20;

        // --- TOTALES ---
        const totalsY = currentY;
        const totalsX = 400;

        // Base imponible
        doc.fontSize(fonts.normal.size)
           .fillColor(colors.secondary)
           .text('Base Imponible:', totalsX, totalsY, { width: 100, align: 'right' });
        doc.text(this.formatCurrency(factura.baseImponible), totalsX + 100, totalsY, { 
            width: 80, 
            align: 'right',
            bold: true 
        });
        currentY = doc.y;
        
        // IVA
        doc.text(`IVA (${factura.ivaImporte > 0 ? '21%' : '0%'}):`, totalsX, doc.y + 10, { width: 100, align: 'right' });
        doc.text(this.formatCurrency(factura.ivaImporte), totalsX + 100, doc.y - 10, { 
            width: 80, 
            align: 'right',
            bold: true 
        });
        currentY = doc.y + 10;

        // Línea separadora
        doc.strokeColor(colors.primary)
           .lineWidth(2)
           .moveTo(totalsX, doc.y + 15)
           .lineTo(totalsX + 180, doc.y + 15)
           .stroke();

        // Total
        doc.fontSize(fonts.subheader.size)
           .fillColor(colors.accent)
           .text('TOTAL:', totalsX, doc.y + 20, { width: 100, align: 'right', bold: true });
        doc.text(this.formatCurrency(factura.total), totalsX + 100, doc.y - 5, { 
            width: 80, 
            align: 'right',
            bold: true 
        });
        currentY = doc.y + 40;

        // Estado de pago
        const paymentStatusY = doc.y + 30;
        doc.fontSize(fonts.normal.size)
           .fillColor(factura.pagada ? colors.success : colors.warning)
           .text(factura.pagada ? '✓ FACTURA PAGADA' : '○ PENDIENTE DE PAGO', totalsX, paymentStatusY, { 
            width: 150, 
            align: 'center',
            bold: true 
        });

        if (factura.pagada && factura.importePagado > 0) {
            doc.fontSize(fonts.small.size)
               .fillColor(colors.secondary)
               .text(`Importe pagado: ${this.formatCurrency(factura.importePagado)}`, totalsX, doc.y + 5, { 
                   width: 150, 
                   align: 'center' 
               });
        }

        // --- CÓDIGO QR ---
        await this.drawQRCode(doc, factura, datosFiscales, currentY, colors);

        // --- FIRMA DIGITAL (si aplica) ---
        if (includeSignature && factura.xmlFirmado) {
            currentY = doc.y + 30;
            drawSignatureSection(doc, factura, currentY, colors, fonts);
        }

        // --- PIE DE PÁGINA ---
        drawFooter(doc, factura, colors, fonts);

        // Finalizar documento
        doc.end();
    }

    /**
     * Genera y dibuja el código QR
     */
    async drawQRCode(doc, factura, datosFiscales, y, colors) {
        const emisorNif = datosFiscales.emisor.nif;
        const numero = factura.numero;
        const fecha = new Date(factura.fechaEmision).toLocaleDateString('es-ES');
        const total = parseFloat(factura.total).toFixed(2);
        const iva = parseFloat(factura.ivaImporte).toFixed(2);
        const hash = factura.hashActual ? factura.hashActual.substring(0, 16) : '';
        
        const qrContent = [
            `NIF:${emisorNif}`,
            `NUM:${numero}`,
            `FEC:${fecha}`,
            `IMP:${total}EUR`,
            `IVA:${iva}EUR`,
            hash ? `HSH:${hash}` : null
        ].filter(Boolean).join('\n');
        
        try {
            const qrDataUrl = await QRCode.toDataURL(qrContent, { 
                margin: 1, 
                width: 100,
                errorCorrectionLevel: 'M'
            });
            
            // Dibujar QR
            doc.image(qrDataUrl, 450, y, { width: 100 });
            
            // Etiqueta del QR
            doc.fontSize(8)
               .fillColor(colors.secondary)
               .text('Código QR', 450, doc.y + 5, { align: 'center' });
            
        } catch (error) {
            console.error('Error generando QR:', error.message);
        }
    }

    /**
     * Formatea cantidad como moneda
     */
    formatCurrency(value) {
        return new Intl.NumberFormat('es-ES', { 
            style: 'currency', 
            currency: 'EUR' 
        }).format(value);
    }

    /**
     * Obtiene lista de logos disponibles
     */
    getAvailableLogos() {
        return this.availableLogos;
    }

    /**
     * Previsualiza PDF en ventana de Electron
     */
    async previewPDF(factura, options = {}) {
        const result = await this.generateEnhancedPDF(factura, options);
        
        // Guardar temporalmente para previsualización
        const tempPath = path.join(require('os').tmpdir(), `preview_${Date.now()}.pdf`);
        fs.writeFileSync(tempPath, result.buffer);
        
        return {
            tempPath,
            metadata: result.metadata
        };
    }
}

module.exports = new EnhancedPDFService();
