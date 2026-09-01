# 📘 Guía de Usuario Completa: Win o Win Facturación

Bienvenido a **Win o Win**, la solución de escritorio definitiva para la gestión de facturación electrónica en España, diseñada para cumplir rigurosamente con la **Ley CREA y CRECE** y el reglamento **Veri*Factu**.

Esta guía te llevará paso a paso desde la configuración inicial hasta el control avanzado de tu tesorería y cumplimiento fiscal.

---

## 📑 Índice
1. [🚀 1. Primeros Pasos y Dashboard](#-1-primeros-pasos-y-dashboard)
2. [⚙️ 2. Configuración del Perfil Emisor y Productor](#-2-configuración-del-perfil-emisor-y-productor)
3. [🔢 3. Gestión de Series de Facturación](#-3-gestión-de-series-de-facturación)
4. [👥 4. Gestión de Clientes](#-4-gestión-de-clientes)
5. [📄 5. Ciclo de Vida de una Factura Ordinaria](#-5-ciclo-de-vida-de-una-factura-ordinaria)
6. [🔄 6. Facturas Rectificativas: Cómo corregir errores](#-6-facturas-rectificativas-cómo-corregir-errores)
7. [💰 7. Control de Cobros y Tesorería](#-7-control-de-cobros-y-tesorería)
8. [🛡️ 8. Veri*Factu, Firma Digital y Seguridad](#-8-verifactu-firma-digital-y-seguridad)
9. [⚙️ 9. Mantenimiento y Copias de Seguridad](#-9-mantenimiento-y-copias-de-seguridad)
10. [❓ FAQ y Solución de Problemas](#-faq-y-solución-de-problemas)

---

## 🚀 1. Primeros Pasos y Dashboard

### Instalación y Primer Arranque
Al abrir la aplicación por primera vez, se te solicitará crear tus credenciales de acceso local.
- **Usuario y Contraseña**: Estos datos se almacenan de forma cifrada en tu ordenador. No viajan a ningún servidor.
- **Email de Recuperación**: Utilizado para restablecer el acceso en caso de olvidar la contraseña.

### El Dashboard (Panel de Control)
Una vez dentro, el Dashboard te ofrece una visión 360º de tu negocio:
- **Resumen Financiero**: Visualiza el total facturado, la base imponible y el IVA repercutido del trimestre actual.
- **Gráfico de Evolución**: Observa el rendimiento de tus ventas mes a mes.
- **Últimas Facturas**: Acceso rápido a los documentos emitidos recientemente.
- **Estado AEAT**: Monitoriza si tus registros están pendientes de envío o aceptados por Hacienda.

---

## ⚙️ 2. Configuración del Perfil Emisor y Productor

Antes de emitir documentos legales, debes configurar la identidad de tu negocio.

### Datos del Emisor
1. Ve a **Perfil Emisor** > **Configuración General**.
2. Completa tu **NIF**, **Razón Social** y datos de contacto.
3. **Logotipo**: Sube una imagen (PNG o JPG) de alta calidad. El sistema la escalará automáticamente para los PDFs.
4. **Régimen Fiscal**: Por defecto es "01" (Régimen General), pero puedes ajustarlo según tu caso.

### Datos del Productor (RD 1007/2023)
Para cumplir con la normativa técnica, la app registra los datos de la entidad que proporciona el software. Estos datos vienen pre-configurados pero puedes revisarlos en la sección de cumplimiento.

---

## 🔢 3. Gestión de Series de Facturación

Las series permiten organizar tus facturas por año, actividad o tipo.
- **Series Ordinarias**: Para tu facturación diaria (ej: `SERIE-2026`).
- **Series Rectificativas**: Obligatorias para correcciones (ej: `R-2026`).
- **Contadores**: Puedes definir el número inicial de cada serie si vienes de otro programa de factura.

---

## 👥 4. Gestión de Clientes

La ficha de cliente es vital para evitar errores en la facturación.
1. Haz clic en **Nuevo Cliente**.
2. **Tipo**: Elige entre Empresa/Autónomo (NIF con letra) o Particular.
3. **Direcciones**: 
    - **Fiscal**: La que aparecerá legalmente en la factura.
    - **Entrega**: Opcional, para indicar dónde se envían los bienes físicamente.
4. **Observaciones**: Puedes añadir notas internas que no aparecerán en la factura.

---

## 📄 5. Ciclo de Vida de una Factura Ordinaria

### Creación Paso a Paso
1. **Seleccionar Serie**: El sistema asignará el siguiente número correlativo automáticamente.
2. **Elegir Cliente**: Al seleccionarlo, sus datos se cargarán al instante. Puedes editar la dirección solo para esa factura si es necesario.
3. **Añadir Conceptos**:
    - **Descripción**: Detalla el servicio o producto.
    - **Cantidad y Precio**: El sistema calculará el subtotal.
    - **IVA**: Selecciona el tipo aplicable (21%, 10%, 4% o 0% si es exento).
    - **IRPF**: Si eres autónomo y tu cliente es una empresa, aplica la retención correspondiente (ej. 15% o 7%).
4. **Método de Pago**: Selecciona cómo esperas cobrar (Transferencia, Efectivo, etc.).

### Previsualización y Emisión
> [!CAUTION]
> **Acción Inalterable**: Una vez que pulses "Emitir Factura", el registro se bloquea por normativa Veri*Factu. Asegúrate de revisar el **PDF de Previsualización** antes de confirmar.

Al emitir:
- Se genera un **Hash SHA-256** que encadena la factura a la anterior.
- Se dibuja un **Código QR** en el pie de página que permite verificar la validez legal del documento.

---

## 🔄 6. Facturas Rectificativas: Cómo corregir errores

Si detectas un error en una nota emitida, no puedes borrarla ni editarla. Debes rectificarla.
1. Localiza la factura errónea en el listado.
2. Pulsa el botón **Rectificar**.
3. **Elige el motivo (R1-R5)**:
    - **R1**: Error en el tipo o cuota de IVA.
    - **R2**: Modificaciones en la base (concursos, impagos).
    - **R3**: Devoluciones de mercancía.
    - **R4**: Errores materiales o aritméticos simples.
    - **R5**: Otras causas.
4. El sistema creará un nuevo borrador de factura vinculado a la original, que deberás emitir para que tenga validez legal.

---

## 💰 7. Control de Cobros y Tesorería

La aplicación te ayuda a saber quién te debe dinero.
- **Marcar como Pagada**: Desde el listado de facturas, haz clic en el estado para cambiarlo.
- **Importe Pagado**: Permite registrar pagos parciales si tu cliente no abona el total de una vez.
- **Informes de IVA**: Accede a la sección **Informes** para obtener el resumen trimestral necesario para el **Modelo 303**.

---

## 🛡️ 8. Veri*Factu, Firma Digital y Seguridad

### Cumplimiento Veri*Factu
Esta aplicación cumple con el Real Decreto 1007/2023:
- **Inalterabilidad**: No existe el botón "Borrar" para facturas emitidas.
- **Trazabilidad**: Cada acción queda registrada en el sistema de logs con marca de tiempo.
- **Encadenamiento**: Se garantiza la integridad de la base de datos mediante criptografía.

### Firma Electrónica (XAdES)
Si necesitas enviar el fichero XML oficial o deseas que tus PDFs tengan validez legal reforzada:
1. Ve a configuración y carga tu **Certificado Digital (.p12)**.
2. En los detalles de cualquier factura emitida, pulsa **Firmar Digitalmente**.

---

## ⚙️ 9. Mantenimiento y Copias de Seguridad

Al ser software local, la custodia de los datos recae sobre ti.
- **Backup Manual**: Ve a Configuración y pulsa **Exportar Backup**. Recomendamos hacerlo al cerrar el día.
- **Frecuencia Automática**: Puedes configurar la app para que te recuerde realizar copias de seguridad de forma semanal o mensual.
- **Ubicación de Facturas**: Los PDFs se guardan en tu carpeta de documentos local, organizados por años.

---

## ❓ FAQ y Solución de Problemas

**¿Puedo usar el programa en dos ordenadores a la vez?**
No de forma sincronizada, ya que la base de datos es local. Sin embargo, puedes mover el archivo `dev.db` entre equipos si es necesario.

**He perdido mi contraseña, ¿qué hago?**
Usa la opción "He olvidado mi contraseña" en la pantalla de inicio. Necesitarás acceso al email de recuperación que configuraste al principio.

**La AEAT me ha dado un error al intentar enviar el XML**
Verifica que tu certificado digital no haya caducado y que el NIF del cliente sea válido (puedes comprobarlo en el censo de la AEAT).

---
*Win o Win Facturación: Gestión transparente, segura y legal.*
