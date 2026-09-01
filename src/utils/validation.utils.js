/**
 * Utilidades para la validación de NIFA (DNI, NIE, CIF) españoles.
 * Implementación basada en los algoritmos oficiales de la AEAT.
 */

const validationUtils = {
    /**
     * Valida si un NIF, NIE o CIF es formalmente correcto.
     * @param {string} doc El documento a validar.
     * @returns {boolean} True si es válido, False si no.
     */
    isValidSpanishDoc: function(doc) {
        if (!doc) return false;
        doc = doc.toUpperCase().trim();
        if (doc.length !== 9) return false;

        // 1. DNI (8 números + 1 letra)
        if (/^[0-9]{8}[A-Z]$/.test(doc)) {
            return this.validateDNI(doc);
        }

        // 2. NIE (Letra X, Y, Z + 7 números + 1 letra)
        if (/^[XYZ][0-9]{7}[A-Z]$/.test(doc)) {
            return this.validateNIE(doc);
        }

        // 3. CIF (Letra + 7 números + Dígito de control)
        if (/^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/.test(doc)) {
            return this.validateCIF(doc);
        }

        return false;
    },

    /**
     * Algoritmo del número del DNI.
     */
    validateDNI: function(dni) {
        const letters = "TRWAGMYFPDXBNJZSQVHLCKE";
        const number = parseInt(dni.substring(0, 8), 10);
        const letter = dni.charAt(8);
        return letters.charAt(number % 23) === letter;
    },

    /**
     * Algoritmo del NIE.
     */
    validateNIE: function(nie) {
        let prefix = nie.charAt(0);
        let value = "";
        
        if (prefix === 'X') value = "0";
        else if (prefix === 'Y') value = "1";
        else if (prefix === 'Z') value = "2";
        
        const nieModified = value + nie.substring(1);
        return this.validateDNI(nieModified);
    },

    /**
     * Algoritmo del CIF.
     */
    validateCIF: function(cif) {
        const type = cif.charAt(0);
        const numbers = cif.substring(1, 8);
        const control = cif.charAt(8);
        
        let sum = 0;
        for (let i = 0; i < numbers.length; i++) {
            let n = parseInt(numbers.charAt(i), 10);
            if (i % 2 === 0) { // Posiciones impares (base 1) -> 1, 3, 5, 7
                n *= 2;
                if (n > 9) n = (n % 10) + 1;
            }
            sum += n;
        }
        
        const lastDigit = (10 - (sum % 10)) % 10;
        const letters = "JABCDEFGHI";
        
        // El dígito de control puede ser número o letra dependiendo del tipo de sociedad
        // Tipos con letra obligatoria: P, Q, S, V, N, W (Organismos públicos, locales, congregaciones...)
        if ("PQSWNW".indexOf(type) !== -1) {
            return control === letters.charAt(lastDigit);
        }
        // Tipos con número obligatorio: A, B, E, H (S.A., S.L., Comunidades, Herencias...)
        else if ("ABEH".indexOf(type) !== -1) {
            return control === lastDigit.toString();
        }
        // El resto puede ser ambos
        else {
            return control === lastDigit.toString() || control === letters.charAt(lastDigit);
        }
    }
};

module.exports = validationUtils;
