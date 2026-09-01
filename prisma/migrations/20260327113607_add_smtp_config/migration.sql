-- CreateTable
CREATE TABLE "cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tipoCliente" TEXT NOT NULL DEFAULT 'EMPRESA',
    "nombre" TEXT NOT NULL,
    "razonSocial" TEXT,
    "nif" TEXT NOT NULL,
    "direccion" TEXT,
    "codigoPostal" TEXT,
    "ciudad" TEXT,
    "provincia" TEXT,
    "pais" TEXT DEFAULT 'España',
    "email" TEXT,
    "telefono" TEXT,
    "direccionEntrega" TEXT,
    "observaciones" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "factura" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "numero" TEXT NOT NULL,
    "fechaEmision" DATETIME NOT NULL,
    "fechaOperacion" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'EMITIDA',
    "baseImponible" DECIMAL NOT NULL,
    "ivaImporte" DECIMAL NOT NULL,
    "irpfPorcentaje" DECIMAL,
    "irpfImporte" DECIMAL,
    "total" DECIMAL NOT NULL,
    "datosFiscales" TEXT NOT NULL,
    "detallesNormativa" TEXT,
    "hashCadenaAnterior" TEXT,
    "hashActual" TEXT,
    "xmlFirmadoPath" TEXT,
    "xmlFirmado" TEXT,
    "fechaHoraHitoGen" DATETIME,
    "sifNombre" TEXT,
    "sifVersion" TEXT,
    "sifNif" TEXT,
    "aeatEstado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "aeatCsv" TEXT,
    "aeatError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "descuento" DECIMAL,
    "notas" TEXT,
    "metodoPago" TEXT,
    "pagada" BOOLEAN NOT NULL DEFAULT false,
    "importePagado" DECIMAL NOT NULL DEFAULT 0.00,
    "cuentaBancaria" TEXT,
    "clienteId" INTEGER NOT NULL,
    "emisorId" INTEGER NOT NULL,
    CONSTRAINT "factura_emisorId_fkey" FOREIGN KEY ("emisorId") REFERENCES "emisor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "factura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "facturalinea" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "descripcion" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" DECIMAL NOT NULL,
    "tipoIva" DECIMAL NOT NULL,
    "importe" DECIMAL NOT NULL,
    "facturaId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "facturalinea_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "factura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "emisor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "regimenFiscal" TEXT NOT NULL DEFAULT '01',
    "direccion" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "cp" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'ES',
    "telefono" TEXT,
    "email" TEXT,
    "web" TEXT,
    "sifNombre" TEXT NOT NULL DEFAULT 'SPG Facturación',
    "sifVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "sifNif" TEXT NOT NULL DEFAULT 'B12345678',
    "productorNombre" TEXT,
    "productorDireccion" TEXT,
    "productorLocalidad" TEXT,
    "productorProvincia" TEXT,
    "productorCp" TEXT,
    "productorPais" TEXT DEFAULT 'España',
    "productorEmail" TEXT,
    "productorTelefono" TEXT,
    "seriePorDefecto" TEXT NOT NULL DEFAULT 'A',
    "ivaPorDefecto" DECIMAL NOT NULL DEFAULT 21.00,
    "metodoPagoPorDefecto" TEXT NOT NULL DEFAULT '02',
    "proximoNumeroFactura" INTEGER NOT NULL DEFAULT 1,
    "prefijoFactura" TEXT NOT NULL DEFAULT 'F',
    "emailEnvioPorDefecto" BOOLEAN NOT NULL DEFAULT false,
    "emailPlantilla" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER DEFAULT 587,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "smtpFromName" TEXT,
    "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
    "certificadoPath" TEXT,
    "certificadoPassword" TEXT,
    "backupAutomatico" BOOLEAN NOT NULL DEFAULT true,
    "backupPath" TEXT,
    "backupFrecuencia" TEXT NOT NULL DEFAULT 'semanal',
    "observacionesPorDefecto" TEXT,
    "pieDePagina" TEXT,
    "verifactuEnabled" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "telefono" INTEGER NOT NULL,
    "nif" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombreComercial" TEXT,
    "prefijoFactura" TEXT NOT NULL DEFAULT 'FACT-',
    "siguienteNumero" INTEGER NOT NULL DEFAULT 1,
    "ivaDefecto" DECIMAL NOT NULL DEFAULT 21.00,
    "irpfDefecto" DECIMAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "verifactuEnabled" BOOLEAN NOT NULL DEFAULT false,
    "certPath" TEXT,
    "website" TEXT,
    "cuentaBancaria" TEXT,
    "nombreMarca" TEXT,
    "logoPath" TEXT,
    "passwordHash" TEXT,
    "recoveryEmail" TEXT,
    "username" TEXT,
    "recoveryCode" TEXT,
    "recoveryCodeExpires" DATETIME
);

-- CreateTable
CREATE TABLE "eventoLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fechaHora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "datos" TEXT,
    "usuarioId" INTEGER,
    "hashAnterior" TEXT,
    "hashActual" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_nif_key" ON "cliente"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "Factura_numero_key" ON "factura"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Emisor_nif_key" ON "emisor"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_nif_key" ON "usuario"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_username_key" ON "usuario"("username");
