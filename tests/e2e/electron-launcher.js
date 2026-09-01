const { _electron: playwright } = require('@playwright/test');
const path = require('path');

/**
 * Launch the Electron application for Playwright testing.
 * @returns {Promise<{electronApp: import('@playwright/test').ElectronApplication, window: import('@playwright/test').Page}>}
 */
async function launchApp() {
  const executablePath = 'C:\\Users\\Sergi\\AppData\\Local\\Programs\\winowin-facturacion\\Win o Win Facturación.exe';
  
  const electronApp = await playwright.launch({
    executablePath: executablePath,
    timeout: 30000
  });

  const window = await electronApp.firstWindow();
  
  // Wait for the window to be ready
  await window.waitForLoadState('domcontentloaded');

  return { electronApp, window };
}

module.exports = { launchApp };
