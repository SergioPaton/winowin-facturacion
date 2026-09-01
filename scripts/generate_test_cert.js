const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

function generateP12() {
    console.log('Generando certificado de prueba para VeriFactu...');
    
    // Generar par de claves
    const keys = forge.pki.rsa.generateKeyPair(2048);
    
    // Crear certificado
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
    
    const attrs = [
        { name: 'commonName', value: 'Prueba VeriFactu' },
        { name: 'countryName', value: 'ES' },
        { shortName: 'ST', value: 'Madrid' },
        { name: 'localityName', value: 'Madrid' },
        { name: 'organizationName', value: 'Win o Win Testing' },
        { shortName: 'OU', value: 'Software Department' }
    ];
    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());
    
    // Crear contenedor P12
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], 'password123');
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    
    const certPath = path.join(__dirname, '..', 'certificado_prueba.p12');
    fs.writeFileSync(certPath, p12Der, 'binary');
    
    console.log(`Certificado generado con éxito en: ${certPath}`);
    console.log('Contraseña: password123');
}

generateP12();
