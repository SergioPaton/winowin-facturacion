const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('contexto/FACTURA WIN O WIN 2025 (Segurma 1)dt.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err => console.error(err));
