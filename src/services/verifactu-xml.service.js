const { SIF } = require('../config/verifactu.config');

/**
 * Servicio para generar XML compatibles con el esquema VerifactuIngreso.xsd de la AEAT
 */
class VerifactuXmlService {
    /**
     * Genera el XML de alta de factura (VerifactuIngreso)
     * @param {Object} factura - Objeto factura de Prisma (con facturalinea y datosFiscales)
     * @returns {string} XML generado
     */
    generateAltaXML(factura, wrapSoap = false) {
        const emisor = factura.datosFiscales.emisor;
        const receptor = factura.datosFiscales.receptor;
        
        // Formato: YYYY-MM-DDTHH:mm:ss (Sin milisegundos ni Z)
        const hitoGen = new Date(factura.fechaHoraHitoGen).toISOString().split('.')[0];
        const fechaExp = new Date(factura.fechaEmision).toISOString().split('T')[0];

        // 1. Agrupar líneas por tipo de IVA para el desglose
        const desgloseIVA = this._calculateDesgloseIVA(factura.facturalinea);

        // 2. Construcción del XML
        const xmlBody = `
<ver:RegFactuSistemaFacturacion xmlns:ver="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroRegFactu.xsd" xmlns:sum="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd">
    <ver:Cabecera>
        <ver:IDVersion>1.0</ver:IDVersion>
        <ver:ObligadoEmision>
            <sum:NombreRazon>${this._escapeXml(emisor.nombre)}</sum:NombreRazon>
            <sum:NIF>${emisor.nif}</sum:NIF>
        </ver:ObligadoEmision>
    </ver:Cabecera>
    <ver:RegistroFactura>
        <ver:RegistroAlta>
            <ver:IDFactura>
                <sum:IDEmisorFactura>
                    <sum:NIF>${emisor.nif}</sum:NIF>
                </sum:IDEmisorFactura>
                <sum:SerieNumeroFactura>${this._escapeXml(factura.numero)}</sum:SerieNumeroFactura>
                <sum:FechaExpedicionFacturaEmisor>${fechaExp}</sum:FechaExpedicionFacturaEmisor>
            </ver:IDFactura>
            <ver:NombreRazonReceptor>${this._escapeXml(receptor.nombre)}</ver:NombreRazonReceptor>
            <ver:NIFReceptor>${receptor.nif}</ver:NIFReceptor>
            <ver:TipoFactura>${factura.tipoFactura || 'F1'}</ver:TipoFactura>
            ${this._renderFacturasRectificadas(factura)}
            <ver:FechaHoraHitoGen>${hitoGen}</ver:FechaHoraHitoGen>
            <ver:DatosFactura>
                <ver:DescripcionOperacion>${this._escapeXml(factura.notas || 'Prestación de servicios / Venta de bienes')}</ver:DescripcionOperacion>
                <ver:ImporteTotal>${Number(factura.total).toFixed(2)}</ver:ImporteTotal>
                <ver:DesgloseFactura>
                    <ver:DesgloseIVA>
                        ${desgloseIVA.map(item => `
                        <ver:DetalleIVA>
                            <ver:TipoImpositivo>${Number(item.tipo).toFixed(2)}</ver:TipoImpositivo>
                            <ver:BaseImponible>${Number(item.base).toFixed(2)}</ver:BaseImponible>
                            <ver:CuotaRepercutida>${Number(item.cuota).toFixed(2)}</ver:CuotaRepercutida>
                        </ver:DetalleIVA>`).join('')}
                    </ver:DesgloseIVA>
                </ver:DesgloseFactura>
            </ver:DatosFactura>
            <ver:Encadenamiento>
                <ver:HuellaRegistroAnterior>${factura.hashCadenaAnterior || ''}</ver:HuellaRegistroAnterior>
            </ver:Encadenamiento>
            <ver:SistemaInformatico>
                <ver:Nombre>${this._escapeXml(SIF.NOMBRE)}</ver:Nombre>
                <ver:Version>${SIF.VERSION}</ver:Version>
                <ver:NIF>${SIF.NIF}</ver:NIF>
            </ver:SistemaInformatico>
        </ver:RegistroAlta>
    </ver:RegistroFactura>
</ver:RegFactuSistemaFacturacion>`;

        if (wrapSoap) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Header/>
    <soapenv:Body>${xmlBody}</soapenv:Body>
</soapenv:Envelope>`;
        }

        return xmlBody.trim();
    }

    /**
     * Renderiza el bloque de FacturasRectificadas si es necesario
     */
    _renderFacturasRectificadas(factura) {
        if (!factura.facturaRectificadaId || !factura.rectificada) return '';
        
        const fechaExpOriginal = new Date(factura.rectificada.fechaEmision).toISOString().split('T')[0];
        
        return `
            <ver:FacturasRectificadas>
                <ver:IDFacturaRectificada>
                    <sum:IDEmisorFactura>
                        <sum:NIF>${factura.datosFiscales.emisor.nif}</sum:NIF>
                    </sum:IDEmisorFactura>
                    <sum:SerieNumeroFactura>${this._escapeXml(factura.rectificada.numero)}</sum:SerieNumeroFactura>
                    <sum:FechaExpedicionFacturaEmisor>${fechaExpOriginal}</sum:FechaExpedicionFacturaEmisor>
                </ver:IDFacturaRectificada>
            </ver:FacturasRectificadas>`;
    }

    /**
     * Calcula los totales de IVA agrupados por tipo impositivo
     */
    _calculateDesgloseIVA(lineas) {
        const grupos = {};
        lineas.forEach(l => {
            const tipo = Number(l.tipoIva);
            if (!grupos[tipo]) {
                grupos[tipo] = { tipo, base: 0, cuota: 0 };
            }
            grupos[tipo].base += Number(l.importe);
            grupos[tipo].cuota += Number(l.importe) * (tipo / 100);
        });
        return Object.values(grupos);
    }

    _escapeXml(unsafe) {
        if (!unsafe) return "";
        return unsafe.replace(/[<>&"']/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '"': return '&quot;';
                case "'": return '&apos;';
            }
        });
    }

    /**
     * Genera el XML de anulación de factura (VerifactuAnulacion)
     * @param {Object} factura - Objeto factura de Prisma a anular
     * @returns {string} XML generado
     */
    generateAnulacionXML(factura, wrapSoap = false) {
        if (typeof factura.datosFiscales === 'string') {
            factura.datosFiscales = JSON.parse(factura.datosFiscales);
        }
        
        const emisor = factura.datosFiscales.emisor;
        
        // Formato: YYYY-MM-DDTHH:mm:ss (Sin milisegundos ni Z)
        // La fecha de anulación es el momento actual
        const hitoGen = new Date().toISOString().split('.')[0];
        const fechaExp = new Date(factura.fechaEmision).toISOString().split('T')[0];

        // 2. Construcción del XML
        const xmlBody = `
<ver:RegFactuSistemaFacturacion xmlns:ver="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroRegFactu.xsd" xmlns:sum="https://www2.agenciatributaria.gob.es/static_files/common/internet/dep/aplicaciones/es/aeat/tike/cont/ws/SuministroInformacion.xsd">
    <ver:Cabecera>
        <ver:IDVersion>1.0</ver:IDVersion>
        <ver:ObligadoEmision>
            <sum:NombreRazon>${this._escapeXml(emisor.nombre)}</sum:NombreRazon>
            <sum:NIF>${emisor.nif}</sum:NIF>
        </ver:ObligadoEmision>
    </ver:Cabecera>
    <ver:RegistroFactura>
        <ver:RegistroAnulacion>
            <ver:IDFactura>
                <sum:IDEmisorFactura>
                    <sum:NIF>${emisor.nif}</sum:NIF>
                </sum:IDEmisorFactura>
                <sum:SerieNumeroFactura>${this._escapeXml(factura.numero)}</sum:SerieNumeroFactura>
                <sum:FechaExpedicionFacturaEmisor>${fechaExp}</sum:FechaExpedicionFacturaEmisor>
            </ver:IDFactura>
            <ver:FechaHoraHitoGen>${hitoGen}</ver:FechaHoraHitoGen>
            <ver:Encadenamiento>
                <ver:HuellaRegistroAnterior>${factura.hashActual || ''}</ver:HuellaRegistroAnterior>
            </ver:Encadenamiento>
            <ver:SistemaInformatico>
                <ver:Nombre>${this._escapeXml(SIF.NOMBRE)}</ver:Nombre>
                <ver:Version>${SIF.VERSION}</ver:Version>
                <ver:NIF>${SIF.NIF}</ver:NIF>
            </ver:SistemaInformatico>
        </ver:RegistroAnulacion>
    </ver:RegistroFactura>
</ver:RegFactuSistemaFacturacion>`;

        if (wrapSoap) {
            return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
    <soapenv:Header/>
    <soapenv:Body>${xmlBody}</soapenv:Body>
</soapenv:Envelope>`;
        }

        return xmlBody.trim();
    }
}

module.exports = new VerifactuXmlService();
