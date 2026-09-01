# VeriFactu Desktop - Sistema de Facturación Electrónica ⚡

![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)
![Electron](https://img.shields.io/badge/platform-Electron-47848F.svg)
![Node.js](https://img.shields.io/badge/backend-Express-000000.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)
![SQLite](https://img.shields.io/badge/database-SQLite-003B57.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

Sistema de escritorio completo para la gestión de facturación electrónica en España, diseñado en estricta conformidad con la normativa **Veri*Factu** (Real Decreto 1007/2023).

---

## 📋 Descripción

Esta aplicación ofrece una solución integral de escritorio que garantiza la **integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad** de los registros de facturación exigidos por la Agencia Tributaria (AEAT).

Implementa un ciclo de vida completo de facturación (facturas ordinarias, simplificadas y rectificativas), encadenamiento inalterable de *hashes*, registro de auditoría (Audit Log), firma de documentos XML (XAdES-EPES), generación de documentos PDF con código QR obligatorio y envío automatizado por correo electrónico.

---

## ✨ Características Principales

- 🧾 **Ciclo de Facturación Completo**: Emisión de facturas ordinarias, rectificativas por sustitución/diferencia y simplificadas.
- 🔗 **Garantía Veri*Factu (Encadenamiento Hash)**: Implementación de encadenamiento SHA-256 entre facturas consecutivas para evitar la alteración o inserción retroactiva de registros.
- 📑 **Generación de PDFs con QR**: Generación dinámica de facturas en PDF con el código QR normativo y resumen de firma digital.
- 🔐 **Seguridad & Privacidad**: Cifrado AES-256-GCM para credenciales SMTP y sensibles, contraseñas protegidas mediante Bcrypt y almacenamiento local en SQLite.
- 📜 **Log de Auditoría (Audit Log)**: Registro inalterable de todos los eventos del ciclo de vida de las facturas para cumplimiento legal.
- 👤 **Gestión de Emisor y Clientes**: Directorio de clientes con validación fiscal (NIF/CIF) y configuración del perfil emisor.
- ✉️ **Envío Automático por Email**: Integración SMTP para enviar facturas y recibos directamente a los clientes.
- 🧪 **Suite de Tests E2E**: Batería de pruebas automatizadas con **Playwright** para validar flujos críticos e integridad de datos.

---

## 🚀 Tecnologías Utilizadas

### Core & Backend
- **Electron**: Entorno ejecutable de escritorio nativo multiplataforma.
- **Node.js & Express**: Servidor API REST local de alto rendimiento.
- **Prisma ORM**: Modelado y gestión de la base de datos relacional.
- **SQLite**: Motor de base de datos ultraligero y local.

### Librerías & Utilidades
- **PDFKit**: Renderizado dinámico de archivos PDF.
- **XML-Crypto / Node-Forge**: Firma digital XAdES-EPES y gestión de certificados digitales.
- **Zod & Joi**: Validación estricta de esquemas de datos y peticiones.
- **Nodemailer**: Motor de envío de correos electrónicos.
- **Playwright**: Automatización de pruebas end-to-end (E2E).

---

## 📂 Estructura del Proyecto

```text
facturacion/
├── src/
│   ├── main.js           # Proceso principal de Electron e IPC
│   ├── server.js         # Inicialización de la API REST local
│   ├── app.js            # Configuración de Express y middlewares
│   ├── controllers/      # Controladores (Facturas, Clientes, Auth, PDF)
│   ├── services/         # Servicios de negocio (Veri*Factu, PDF, XML, Email)
│   ├── middleware/       # Validación y seguridad
│   └── utils/            # Utilidades de cifrado y validaciones
├── public/               # Frontend de la aplicación (HTML5, CSS3, JS Vanilla)
├── prisma/               # Esquemas de base de datos y migraciones
├── scripts/              # Scripts auxiliares de generación y utilidades
├── tests/                # Pruebas unitarias y de integración E2E (Playwright)
├── package.json          # Dependencias del proyecto y scripts
└── README.md             # Documentación principal
```

---

## ⚙️ Instalación y Configuración

### Requisitos Previos
- **Node.js** (v18.0.0 o superior)
- **npm** (v9.0.0 o superior)

### Pasos de Configuración

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/SergioPaton/winowin-facturacion.git
   cd winowin-facturacion
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar el archivo de entorno:**
   Copiar la plantilla `.env.example` a `.env`:
   ```bash
   cp .env.example .env
   ```

4. **Inicializar la base de datos:**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Iniciar en modo desarrollo:**
   ```bash
   npm run electron:dev
   ```

---

## 🛡️ Detalles Técnicos de Cumplimiento (Veri*Factu - RD 1007/2023)

1. **Hash Chaining**: Cada registro almacena `hash_anterior` y `hash_actual` calculados mediante algoritmos estándar SHA-256.
2. **Respuesta XML**: Generación de estructuras de datos XML en conformidad con los esquemas oficiales de la AEAT.
3. **Código QR Normativo**: Inclusión de URLs y códigos de verificación en la representación impresa (PDF).
4. **Verificación de Integridad**: Detección de brechas en la secuencia de facturas o alteración no autorizada de registros.

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.
