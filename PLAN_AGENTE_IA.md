# Plan: Agente de IA VeriFactu con Ollama Local

Este plan detalla la integración de un Agente de IA en n8n que utiliza el backend de `winowin/facturación` para emitir facturas legales que cumplen con la normativa VeriFactu.

## User Review Required

> [!IMPORTANT]
> **Normativa VeriFactu**: Para que las facturas sean 100% legales, el sistema debe encadenar hashes y, eventualmente, firmar con un certificado digital. Utilizaremos la lógica ya presente en `winowin/facturación`.
>
> **Modelo de IA**: Recomiendo utilizar **Llama 3.1 (8B)** o **Mistral (7B)** a través de Ollama. Estos modelos son gratuitos, se ejecutan localmente y tienen un excelente desempeño en español para seguir instrucciones complejas.

## Proposed Changes

### 1. Preparación del Backend (winowin/facturación)

#### [NEW] [.env](file:///c:/Users/Sergi/Desktop/spg/winowin/facturación/.env)
Configurar las variables necesarias para la API (Puerto 3001 para no entrar en conflicto con la otra API).

#### [MODIFY] [app.js](file:///c:/Users/Sergi/Desktop/spg/winowin/facturación/src/app.js)
Asegurar que los CORS permitan peticiones desde el contenedor de n8n.

### 2. Configuración de n8n

#### [NEW] Workflow: Agente VeriFactu
Crear un workflow que incluya:
- **AI Agent Node**: Configurado con un System Prompt que actúe como gestor contable.
- **Ollama Chat Model**: Conectado al servicio de Ollama en Docker, usando el modelo `llama3.1`.
- **Herramientas (Tools)**:
    - `get_clients`: Llama a `GET /api/clientes`.
    - `create_client`: Llama a `POST /api/clientes`.
    - `create_invoice`: Llama a `POST /api/facturas`. Esta herramienta enviará el JSON necesario y el backend de `winowin` se encargará de:
        - Generar el hash encadenado.
        - Crear el XML VeriFactu.
        - Generar el PDF con código QR.

### 3. Ejecución Local de IA

#### Descarga de Modelo
Instrucciones para descargar el modelo en el contenedor de Ollama:
```powershell
docker exec -it ollama ollama run llama3.1
```

## Open Questions

- **Certificado Digital**: ¿Dispones de un archivo `.p12` o `.pfx` para la firma electrónica, o usamos uno de prueba por ahora?
- **Hardware**: ¿Tu equipo tiene al menos 16GB de RAM? (Recomendado para modelos de 7B-8B).

## Verification Plan

### Manual Verification
1.  **Iniciar Backend**: Ejecutar el servidor de `winowin/facturación`.
2.  **Prueba de Agente**: En el chat de n8n, pedir: *"Genera una factura para el cliente 'TecnoSl' (NIF: B12345678) por un ordenador de 1200€"*.
3.  **Verificación PDF**: Comprobar que en la carpeta de descargas del backend aparezca el PDF con el logo, QR y datos VeriFactu.
4.  **Verificación XML**: Revisar que se haya generado el XML con el hash encadenado correcto.
