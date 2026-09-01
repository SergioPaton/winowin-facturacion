const db = require('../config/db');

/**
 * Servicio para la generación de informes fiscales (IVA 303/390).
 */
const getIVASummary = async (year) => {
    const facturas = await db.prisma.factura.findMany({
        where: {
            fechaEmision: {
                gte: new Date(`${year}-01-01`),
                lte: new Date(`${year}-12-31T23:59:59.999Z`)
            },
            estado: { not: "ANULADA" }
        },
        include: { facturalinea: true }
    });

    // Estructura por trimestre y tipo de IVA
    const summary = {
        year,
        quarters: {
            T1: { base: 0, iva: 0, total: 0, byRate: {} },
            T2: { base: 0, iva: 0, total: 0, byRate: {} },
            T3: { base: 0, iva: 0, total: 0, byRate: {} },
            T4: { base: 0, iva: 0, total: 0, byRate: {} }
        },
        annual: { base: 0, iva: 0, total: 0, byRate: {} }
    };

    facturas.forEach(factura => {
        const month = factura.fechaEmision.getMonth();
        let qKey = "T1";
        if (month >= 3 && month <= 5) qKey = "T2";
        else if (month >= 6 && month <= 8) qKey = "T3";
        else if (month >= 9 && month <= 11) qKey = "T4";

        const q = summary.quarters[qKey];
        const a = summary.annual;

        factura.facturalinea.forEach(linea => {
            const rate = linea.tipoIva.toString();
            const base = parseFloat(linea.importe);
            const iva = base * (linea.tipoIva / 100);

            // Update Quarter
            q.base += base;
            q.iva += iva;
            q.total += (base + iva);
            if (!q.byRate[rate]) q.byRate[rate] = { base: 0, iva: 0 };
            q.byRate[rate].base += base;
            q.byRate[rate].iva += iva;

            // Update Annual
            a.base += base;
            a.iva += iva;
            a.total += (base + iva);
            if (!a.byRate[rate]) a.byRate[rate] = { base: 0, iva: 0 };
            a.byRate[rate].base += base;
            a.byRate[rate].iva += iva;
        });
    });

    return summary;
};

module.exports = {
    getIVASummary
};
