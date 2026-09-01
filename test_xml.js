const verifactuXmlService = require('./src/services/verifactu-xml.service');
const fs = require('fs');

const mockFactura = {
    id: 1,
    numero: "F2026-0001",
    fechaEmision: new Date("2026-03-26"),
    fechaHoraHitoGen: new Date("2026-03-26T12:00:00Z"),
    total: 121.00,
    notas: "Venta de productos de prueba",
    hashCadenaAnterior: "0".repeat(64),
    hashActual: "abc123hashactual",
    datosFiscales: {
        emisor: {
            nombre: "EMPRESA DE PRUEBA SL",
            nif: "B12345678"
        },
        receptor: {
            nombre: "CLIENTE FINAL SA",
            nif: "A87654321"
        }
    },
    facturalinea: [
        {
            descripcion: "Producto A",
            cantidad: 1,
            precioUnitario: 100,
            tipoIva: 21,
            importe: 100
        }
    ]
};

// Generar versión Normal (Sin SOAP)
const xmlNormal = verifactuXmlService.generateAltaXML(mockFactura, false);
fs.writeFileSync('sample_verifactu_clean.xml', xmlNormal);

// Generar versión con SOAP Envelope
const xmlSoap = verifactuXmlService.generateAltaXML(mockFactura, true);
fs.writeFileSync('sample_verifactu_soap.xml', xmlSoap);

console.log("Archivos generados: sample_verifactu_clean.xml y sample_verifactu_soap.xml");
