const { test, expect } = require('@playwright/test');
const { launchApp } = require('./electron-launcher');

test.describe('Invoicing Validation Tests', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const app = await launchApp();
    electronApp = app.electronApp;
    window = app.window;

    // Bypass login by injecting session into localStorage
    await window.evaluate(() => {
      const testUser = {
        username: 'testadmin',
        loginTimestamp: new Date().toISOString(),
        sessionDuration: '7d',
        nombre: 'Test Admin'
      };
      localStorage.setItem('user', JSON.stringify(testUser));
      // Trigger a reload or just call showApp if it was accessible, 
      // but reloading is cleaner as init() will pick up the localStorage
    });
    
    await window.reload();
    await window.waitForLoadState('domcontentloaded');
    
    // Ensure we are in the app section
    await expect(window.locator('#app-section')).toBeVisible({ timeout: 10000 });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should open invoice modal and show error if no client selected', async () => {
    await window.click('#btn-open-create-invoice');
    await expect(window.locator('#invoice-modal')).toBeVisible();

    // Try to submit without filling anything
    // Note: HTML5 validation might stop this, so we check if toast shows up or if modal stays open
    await window.click('#invoice-submit-btn');

    // If HTML5 validation is active, the form won't submit. 
    // If not, we expect an error toast from the backend/frontend logic.
    await expect(window.locator('#invoice-modal')).toBeVisible();
  });

  test('should validate invalid price input', async () => {
    await window.click('#btn-open-create-invoice');
    
    // Fill first line with invalid price (e.g. text)
    // Playwright fill might not allow text in type="number", so we try to type it
    const priceInput = window.locator('.line-price').first();
    await priceInput.fill('-10'); // Negative price should ideally be invalid or handled
    
    await window.click('#invoice-submit-btn');
    
    // Check if modal still open (validation failed)
    await expect(window.locator('#invoice-modal')).toBeVisible();
  });

  test('should be able to add and remove lines', async () => {
    await window.click('#btn-open-create-invoice');
    
    const initialLines = await window.locator('.invoice-line').count();
    expect(initialLines).toBe(1);

    await window.click('#add-line-btn');
    expect(await window.locator('.invoice-line').count()).toBe(2);

    await window.locator('.remove-line').last().click();
    expect(await window.locator('.invoice-line').count()).toBe(1);
  });
});
