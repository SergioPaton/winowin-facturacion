const { test, describe, mock } = require('node:test');
const assert = require('node:assert');

// Interceptar require.cache para mockear el módulo db antes de que se cargue
const dbPath = require.resolve('../src/config/db');
const mockPrisma = {
    usuario: { 
        findUnique: async () => ({
            id: 1,
            nombre: 'Juan',
            apellido: 'Pérez',
            nif: '12345678X',
            direccion: 'Calle Falsa 123',
            nombreComercial: 'Juan Tech',
            prefijoFactura: 'FACT-',
            siguienteNumero: 5,
            ivaDefecto: 21
        })
    },
    cliente: { 
        findUnique: async () => ({
            id: 2,
            nombre: 'Empresa Cliente S.L.',
            nif: 'B98765432',
            direccion: 'Avenida Real 45'
        })
    },
    factura: { 
        findFirst: async () => ({
            hashActual: 'hash-anterior-123'
        }),
        create: async ({ data }) => ({ id: 100, ...data })
    },
    $transaction: async (callback) => {
        return await callback({
            factura: {
                create: async ({ data }) => ({ id: 100, ...data }),
            },
            usuario: {
                update: async () => ({ id: 1 }),
            }
        });
    }
};

require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: { prisma: mockPrisma }
};

const facturaService = require('../src/services/factura.service');

describe('Servicio de Facturación', () => {

    test('Debe generar una factura con snapshots inmutables de emisor y receptor', async () => {
        const lineas = [
            { descripcion: 'Servicio Web', cantidad: 1, precioUnitario: 100, tipoIva: 21 }
        ];

        const factura = await facturaService.generateInvoice(1, 2, lineas);

        // Verificar datos del emisor en el snapshot
        assert.strictEqual(factura.datosFiscales.emisor.nombre, 'Juan Pérez');
        assert.strictEqual(factura.datosFiscales.emisor.nif, '12345678X');
        assert.strictEqual(factura.datosFiscales.emisor.direccion, 'Calle Falsa 123');

        // Verificar datos del receptor en el snapshot
        assert.strictEqual(factura.datosFiscales.receptor.nombre, 'Empresa Cliente S.L.');
        assert.strictEqual(factura.datosFiscales.receptor.nif, 'B98765432');
        assert.strictEqual(factura.datosFiscales.receptor.direccion, 'Avenida Real 45');
    });

    test('Debe calcular correctamente los totales y el hash de encadenamiento', async () => {
        const lineas = [
            { descripcion: 'Producto A', cantidad: 2, precioUnitario: 50, tipoIva: 21 }
        ];

        const factura = await facturaService.generateInvoice(1, 2, lineas);

        // Base: 2 * 50 = 100
        // IVA: 100 * 0.21 = 21
        // Total: 121
        assert.strictEqual(factura.baseImponible, 100);
        assert.strictEqual(factura.ivaImporte, 21);
        assert.strictEqual(factura.total, 121);

        // Verificar encadenamiento
        assert.strictEqual(factura.hashCadenaAnterior, 'hash-anterior-123');
        assert.ok(factura.hashActual.length === 64); // SHA-256 hex length
    });
});
