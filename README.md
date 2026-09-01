# Win o Win Facturación - Sistema Veri*Factu 🏆

Sistema integral de facturación electrónica orientado a la normativa española **Veri*Factu** (RD 1007/2023), diseñado específicamente para **Win o Win Consulting**.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Electron](https://img.shields.io/badge/platform-Electron-47848F.svg)
![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 📋 Descripción

Esta aplicación de escritorio permite la gestión completa del ciclo de facturación, garantizando la integridad, conservación, accesibilidad, legibilidad, trazabilidad e inalterabilidad de los registros (requisitos Veri*Factu). Incluye generación de facturas rectificativas, gestión de clientes, perfiles de emisor y encadenamiento de hashes para auditoría legal.

## ✨ Características Principales

- **Gestión de Facturación**: Creación de facturas ordinarias, simplificadas y rectificativas.
- **Cumplimiento Veri*Factu**: Sistema de encadenamiento de hashes, registros de eventos inalterables y trazabilidad completa.
- **Generación de PDFs**: Diseño profesional con códigos QR obligatorios y firmas digitales.
- **Gestión de Clientes y Emisor**: Directorio completo de clientes y configuración detallada del perfil fiscal del emisor.
- **Series de Facturación**: Soporte para múltiples series con contadores independientes.
- **Seguridad**: Cifrado AES-256-GCM para credenciales SMTP y hashing de contraseñas.
- **Auto-Migración**: El sistema detecta y actualiza la estructura de la base de datos automáticamente al iniciar.
- **Envío por Email**: Integración con SMTP para el envío automatizado de facturas a clientes.

## 🚀 Tecnologías Utilizadas

### Core
- **Electron**: Framework para la aplicación de escritorio nativa.
- **Node.js & Express**: Servidor API local para la lógica de negocio.
- **Prisma ORM**: Gestión de la base de datos SQLite.
- **SQLite**: Motor de base de datos ligero y local.

### Librerías Clave
- **PDFKit**: Generación dinámica de documentos PDF.
- **XML-Crypto**: Firma digital de ficheros XML para la AEAT.
- **Nodemailer**: Gestión de envíos de correo electrónico.
- **Zod / Joi**: Validación rigurosa de esquemas de datos.
- **Bcryptjs**: Seguridad en el almacenamiento de credenciales.

## 📂 Estructura del Proyecto

```text
facturacion/
├── prisma/             # Esquema de base de datos y migraciones
├── public/             # Interfaz de usuario (HTML, CSS, JS)
├── src/
│   ├── main.js         # Proceso principal de Electron
│   ├── server.js       # Configuración del servidor Express
│   ├── controllers/    # Lógica de las rutas API
│   ├── services/       # Servicios (Veri*Factu, PDF, Email, Auth)
│   ├── models/         # Interacción con la DB vía Prisma
│   ├── middleware/     # Seguridad y validación
│   ├── utils/          # Utilidades generales y cifrado
│   └── preload.js      # Puente de seguridad Electron (IPC)
├── build/              # Recursos para el empaquetado
├── dist/               # Instaladores generados (.exe)
└── package.json        # Dependencias y scripts
```

## ⚙️ Configuración e Instalación

### Requisitos Previos
- Node.js (v18 o superior)
- npm o yarn

### Instalación
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar el archivo `.env` (copiar el ejemplo si existe).
4. Inicializar la base de datos:
   ```bash
   npx prisma generate
   npx prisma db push
   ```

### Ejecución en Desarrollo
Para lanzar la aplicación Electron con recarga en caliente:
```bash
npm run electron:dev
```

## 📦 Empaquetado (Producción)

Para generar el instalador ejecutable para Windows (`.exe`):
```bash
npm run electron:build
```
El instalador se generará en la carpeta `dist/`.

## 🛡️ Detalles de Cumplimiento Veri*Factu

El sistema implementa las siguientes medidas técnicas para cumplir estrictamente con el **RD 1007/2023** y la **Orden HFP/1177/2024**:

1. **Encadenamiento (Hash Chaining)**: Cada factura incluye el hash de la factura anterior, creando una cadena irrompible que garantiza que no se han insertado ni borrado registros.
2. **Registro de Auditoría (Audit Log)**: Implementado en `eventLog.service.js`, registra de forma inalterable cualquier evento crítico del ciclo de vida de la factura.
3. **Firma XAdES-EPES**: Soporte para firmas electrónicas avanzadas mediante `xades.service.js`, asegurando la autenticidad y el no repudio.
4. **Generación XML Veri*Factu**: Exportación automatizada de los registros de facturación en el formato XML estándar requerido por la AEAT.
5. **Código QR Obligatorio**: Inclusión de códigos QR en todos los PDFs generados, permitiendo la verificación inmediata por parte del destinatario.
6. **Resiliencia y Auto-Curación**: Scripts integrados para la reconstrucción de la cadena de hashes y validación de integridad en cada arranque.


---
> **Nota**: Este software ha sido desarrollado específicamente para **Win o Win Consulting** y cumple con los estándares actuales de la AEAT para sistemas de facturación verificables.
