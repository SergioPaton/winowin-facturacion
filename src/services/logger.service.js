const fs = require('fs');
const path = require('path');
const { app } = require('electron');

/**
 * Senior Logger Service
 * Diseño robusto para captura de excepciones y trazabilidad en producción.
 */
class LoggerService {
    constructor() {
        // En Electron, logueamos en la carpeta de datos de usuario para persistencia real.
        const userDataPath = app ? app.getPath('userData') : process.cwd();
        this.logFilePath = path.join(userDataPath, 'app_errors.log');
        
        const dir = path.dirname(this.logFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Activación del centinela de fondo
        this._setupGlobalHandlers();
    }

    /**
     * Configura escuchadores de fondo para capturar errores no manejados en el proceso.
     */
    _setupGlobalHandlers() {
        process.on('uncaughtException', (err) => {
            this.error('UNCAUGHT EXCEPTION (Background Sentinel)', err);
            // En una app Senior, tras un error no manejado a veces es mejor cerrar 
            // pero lo dejamos abierto por flexibilidad del usuario.
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.error('UNHANDLED REJECTION (Background Sentinel)', reason);
        });

        console.log('[LOGGER] Sentinel activo en segundo plano.');
    }

    /**
     * Registra un error con contexto completo.
     * @param {string} context - Descripción de la acción del usuario (ej: 'Procesando pago')
     * @param {Error|any} error - El objeto de error o mensaje técnico
     */
    error(context, error) {
        const timestamp = new Date().toISOString();
        
        let technicalSummary = {};
        
        if (error instanceof Error) {
            technicalSummary = {
                message: error.message,
                name: error.name,
                stack: error.stack,
                // Extraemos info de archivo/línea del primer frame del stack
                location: this._parseStack(error.stack)
            };
        } else {
            technicalSummary = {
                message: typeof error === 'string' ? error : JSON.stringify(error),
                location: 'Unknown context (not an Error object)'
            };
        }

        const logEntry = {
            timestamp,
            context,
            technicalSummary
        };

        this._write(logEntry);
    }

    /**
     * Método privado para escritura síncrona y segura.
     * Usamos appendFileSync para garantizar que el log se guarda incluso ante un crash inminente.
     */
    _write(entry) {
        try {
            const line = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logFilePath, line, 'utf8');
            
            // También lo sacamos por consola en desarrollo
            if (process.env.NODE_ENV !== 'production') {
                console.error(`[LOGGER] ${entry.context}: ${entry.technicalSummary.message}`);
            }
        } catch (err) {
            // Failsafe: Si el logger falla, lo último que queremos es un nuevo crash.
            console.error('CRITICAL: Falló la escritura en el archivo de logs', err);
        }
    }

    /**
     * Parser simple para el Stack Trace de Node/Electron
     */
    _parseStack(stack) {
        if (!stack) return 'No stack available';
        const lines = stack.split('\n');
        // La línea 1 suele ser el frame que lanzó el error
        const frame = lines[1] || lines[0];
        return frame.trim();
    }
}

// Exportamos una instancia única (Singleton)
module.exports = new LoggerService();
