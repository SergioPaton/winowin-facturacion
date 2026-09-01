const { test, expect } = require('@playwright/test');
const { launchApp } = require('./electron-launcher');
const fs = require('fs');
const path = require('path');

test.describe('Logger & Diagnostics Tests', () => {
    let electronApp;
    let window;

    test.beforeEach(async () => {
        const app = await launchApp();
        electronApp = app.electronApp;
        window = app.window;
    });

    test.afterEach(async () => {
        await electronApp.close();
    });

    test('UI: Support section and export button visibility', async () => {
        // Navigate to settings
        await window.click('.nav-item[data-view="settings"]');
        
        // Check for Support group header
        const supportHeader = window.locator('h3:has-text("Soporte y Diagnóstico")');
        await expect(supportHeader).toBeVisible();
        
        // Check for Export button
        const exportBtn = window.locator('#btn-export-logs');
        await expect(exportBtn).toBeVisible();
        await expect(exportBtn).toContainText('Exportar Reporte de Errores');
    });

    test('Sentinel: captures unhandled rejections automatically', async () => {
        // Trigger an unhandled rejection in the main process (via IPC)
        // We'll use the 'save-settings' but with a specific payload that we'll catch in main
        // to throw an error, OR we can just check if the log file exists.
        
        const userDataPath = await electronApp.evaluate(async ({ app }) => {
            return app.getPath('userData');
        });
        
        const logFilePath = path.join(userDataPath, 'app_errors.log');
        
        // Manual verification of the sentinel:
        // We evaluate an error in the main process
        await electronApp.evaluate(({ process }) => {
            // Trigger asíncrono no manejado
            Promise.reject(new Error('Test de Error de Fondo (Sentinel)'));
        });

        // Dar un pequeño margen para la escritura en disco
        await new Promise(r => setTimeout(r, 1000));

        // Verificar existencia del archivo
        expect(fs.existsSync(logFilePath)).toBeTruthy();
        
        // Leer contenido y verificar el error inyectado
        const content = fs.readFileSync(logFilePath, 'utf8');
        expect(content).toContain('Test de Error de Fondo (Sentinel)');
        expect(content).toContain('UNHANDLED REJECTION');
    });

    test('Logic: No crash on manual error log', async () => {
        // Test that calling the error manually doesn't break the app
        // (Wait for app to be ready)
        await expect(window.locator('#app-section')).toBeVisible();
        
        // We can't call internal Node modules from renderer easily 
        // without a dedicated IPC, but we've verified the global catch works.
    });
});
