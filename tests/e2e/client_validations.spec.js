const { test, expect } = require('@playwright/test');
const { launchApp } = require('./electron-launcher');

test.describe('Client Validation Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const app = await launchApp();
    electronApp = app.electronApp;
    window = app.window;

    // Bypass login using injected localStorage session
    await window.evaluate(() => {
      const user = { username: 'testuser', loginTimestamp: new Date().toISOString(), sessionDuration: '7d', nombre: 'Test User' };
      localStorage.setItem('user', JSON.stringify(user));
    });
    
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should show error for invalid NIF/CIF', async () => {
    // Navigate to clients view
    await window.click('.nav-item[data-view="clients"]');
    await expect(window.locator('#view-clients')).toBeVisible();

    // Open create client modal
    await window.click('#btn-open-create-client');
    await expect(window.locator('#client-modal')).toBeVisible();

    // Fill with invalid NIF
    const nifInput = window.locator('#client-nif');
    await nifInput.fill('ABC123456'); // Invalid length/format
    
    // Fill other mandatory fields
    await window.fill('#client-nombre', 'Test Invalid Client');
    await window.fill('#client-direccion', 'Test Address 123');
    
    // In our app.js, it checks if it's a valid Spanish Doc on submit
    await window.click('#client-submit-btn');

    // Expecting error toast for invalid NIF/CIF
    const toast = window.locator('#toast-container .toast');
    await expect(toast).toBeVisible();
    await expect(toast).toContainText('NIF/CIF introducido no es válido');
    
    // Modal should stay open
    await expect(window.locator('#client-modal')).toBeVisible();
  });

  test('should not submit if mandatory fields are missing', async () => {
    await window.click('.nav-item[data-view="clients"]');
    await window.click('#btn-open-create-client');
    
    // Fill NIF but leave name or address empty
    await window.fill('#client-nif', 'B12345678'); 
    
    // Submit
    await window.click('#client-submit-btn');

    // Expected: HTML5 validation or frontend validation keeps modal open
    await expect(window.locator('#client-modal')).toBeVisible();
  });
});
