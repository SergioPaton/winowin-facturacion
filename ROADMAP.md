# Hoja de Ruta del Desarrollo (Próximos Pasos)

Esta hoja de ruta detalla los próximos pasos a seguir para completar la migración de la aplicación de API Node.js a una aplicación de Escritorio con Electron y SQLite.

## 1. Integración Frontend - Backend (Puente IPC) ✅ COMPLETADO
- [x] Adaptar las peticiones del frontend para dejar de usar `fetch`/`axios` y utilizar el puente `window.electronAPI...` expuesto en `preload.js`.
- [x] Mapear y conectar correctamente los controladores existentes de la API con los canales de comunicación IPC (crear cliente, listar facturas, etc.).

## 2. Finalizar el Flujo de Facturación y VeriFactu ✅ COMPLETADO
- [x] Validar que la generación de XML y el encadenamiento de hashes funcionen sin problemas bajo la nueva arquitectura.
- [x] Comprobar que el guardado local del XML firmado se escribe correctamente en la base de datos SQLite tras su verificación.
- [x] Sustituir mock de firma XAdES-EPES por implementación real con certificados PKCS#12 (node-forge).
- [x] Adaptar Código QR al formato oficial de la AEAT (URL de verificación Veri*Factu).
- [x] Implementar Registro de Eventos (Audit Log) requerido por el Reglamento (RD 1007/2023).
- [x] Lógica de subsanación y gestión de errores de envío con reintentos automáticos.
- [x] Acción para cambiar estado de factura (pendiente → pagada).
- [x] Ajuste de etiquetas y validaciones: "NIF del responsable del sistema informático" (ex-NIF desarrollador).
- [x] **Auditoría y Remediación Veri*Factu:** XML alineado con `VerifactuIngreso.xsd` y encadenamiento de Logs implementado. ✅ COMPLETADO

## 3. Sistema de Backups (Copia de Seguridad) ✅ COMPLETADO
- [x] Diseñar e implementar una función de exportación del archivo `dev.db` (la base de datos SQLite local) como "Copia de Seguridad".
- [x] Implementar la función de importación/restauración de copias de seguridad desde un archivo `.db` con medidas de seguridad.

## 4. Seguridad y Autenticación 🔄 PARCIALMENTE COMPLETADO
- [ ] Revisar el uso actual de JWT. Dado que la aplicación es de uso local, simplificar la protección hacia un PIN/Contraseña local.
- [x] Sistema de usuario + contraseña (implementado con setup inicial y recuperación).

## 5. Empaquetado y Distribución ✅ COMPLETADO
- [x] Configurar las dependencias y scripts de `electron-builder`.
- [x] Configurar los binarios de SQLite/Prisma para el ejecutable optimizado.
- [x] Compilar y generar la primera versión en formato Portable (`win-unpacked`).

## 6. Mejoras de Negocio y UX ✅ COMPLETADO
- [x] **Temas:** Soporte para modo oscuro/claro (Variables CSS + Persistencia). ✅ COMPLETADO
- [x] **Identidad:** Generación de icono profesional para la aplicación.

---
## 7. Expansión de Cumplimiento Legal (Veri*Factu) ✅ COMPLETADO

Para garantizar la plena conformidad con el RD 1007/2023, se han implementado las siguientes funciones obligatorias:

- [x] **Fase 1: Anulación de Facturas**: Implementación de mensajes XML de anulación (`VerifactuAnulacion.xsd`) y lógica de comunicación para cancelar facturas emitidas por error.
- [x] **Fase 2: Facturas Rectificativas**: Soporte para tipos R1-R5, vinculación con facturas originales y actualización del esquema de datos para asegurar la trazabilidad.
- [x] **Fase 3: Inmutabilidad y Bloqueos**: Restricción de edición para facturas con estado "Aceptado" o "Firmado" para evitar alteraciones post-emisión.

## 8. Funcionalidad de Negocio e Informes 💼 COMPLETADO
- [x] **Informes de IVA (Modelos 303/390)**: Vista de resumen de bases e IVA repercutido por trimestre y año para facilitar la gestión fiscal.
- [x] **Filtros Avanzados y Búsqueda**: Implementación de filtros por fecha, cliente y estado de pago en el listado de facturas.
- [x] **Validación de Identidad Fiscal**: Validación formal de formatos NIF/CIF (algoritmos oficiales) para reducir errores de envío a la AEAT.

## 9. Experiencia de Usuario (UX) y Utilidades ⭐ COMPLETADO
- [x] **Visor de PDF Integrado**: Previsualización de la factura antes de su generación final o envío por email.
- [x] **Gestión de Series**: Soporte para múltiples series de facturación (contadores independientes).
- [x] **Auditoría de Eventos**: Interfaz para consulta del log de auditoría y verificación técnica de integridad de datos.

---
## 📊 **Resumen Final:**
- **Estado:** Roadmap Base 100% Completado.
- **Siguiente Objetivo:** Implementación de Fases de Cumplimiento Legal y Mejoras de Negocio.
