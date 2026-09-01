const { test, expect } = require('@playwright/test');
const { launchApp } = require('./electron-launcher');

test.describe('External QA - UX & Robustness Audit', () => {
  let electronApp;
  let window;

  test.beforeEach(async () => {
    const app = await launchApp();
    electronApp = app.electronApp;
    window = app.window;

    // Login mock
    await window.evaluate(() => {
        localStorage.setItem('user', JSON.stringify({
            username: 'external_tester',
            loginTimestamp: new Date().toISOString(),
            sessionDuration: '7d',
            nombre: 'External Auditor'
        }));
    });
    await window.reload();
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('UX: Theme persistence across reloads', async () => {
    // Current theme should be dark (default)
    expect(await window.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('dark');

    // Toggle to light
    await window.click('#theme-toggle');
    expect(await window.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');

    // Reload
    await window.reload();
    await window.waitForLoadState('domcontentloaded');

    // Should still be light
    expect(await window.evaluate(() => document.documentElement.getAttribute('data-theme'))).toBe('light');
  });

  test('UX: Top search bar functionality (Filtering Check)', async () => {
    // Navigate to clients and add one with a specific name
    await window.click('.nav-item[data-view="clients"]');
    await window.click('#btn-open-create-client');
    await window.fill('#client-nombre', 'Unique Searching Client');
    await window.fill('#client-direccion', 'Search St 123');
    await window.click('#client-submit-btn');
    await expect(window.locator('#toast-container')).toBeVisible();

    const searchInput = window.locator('#global-search');
    await searchInput.fill('Unique Searching');
    
    // Check if table contains only the filtered row
    const rows = window.locator('#all-clients-table tbody tr');
    await expect(rows).toHaveCount(1);
    await expect(rows.first()).toContainText('Unique Searching Client');

    // Clear search and check if it restores
    await searchInput.fill('');
    await expect(rows).toHaveCount(await window.evaluate(() => state.clients.length));
  });

  test('Session: Complete logout and history destruction', async () => {
    await window.click('#logout-btn');
    
    // Should be back at auth section
    await expect(window.locator('#auth-section')).toBeVisible();

    // LocalStorage should be clean
    const user = await window.evaluate(() => localStorage.getItem('user'));
    expect(user).toBeNull();
  });

  test('Data: Sanitization of special characters in Client Name', async () => {
    await window.click('.nav-item[data-view="clients"]');
    await window.click('#btn-open-create-client');

    const weirdName = 'Company "Quote" & <Tag> \'Single\'';
    await window.fill('#client-nombre', weirdName);
    await window.fill('#client-direccion', 'Test Address');
    
    await window.click('#client-submit-btn');

    // Wait for toast and check table
    await expect(window.locator('#toast-container')).toBeVisible();
    
    // Check if the name rendering in the table is safe (not breaking the layout)
    const firstRowName = window.locator('#all-clients-table tbody tr').first().locator('td').first();
    await expect(firstRowName).toContainText('Company "Quote"');
  });

  test('Performance: Rapid navigation stress', async () => {
    const views = ['dashboard', 'invoices', 'clients', 'reports', 'audit', 'settings'];
    
    for (const view of views) {
        await window.click(`.nav-item[data-view="${view}"]`);
        // Wait a tiny bit to simulate user speed but fast
        await window.waitForTimeout(100);
    }

    // Verify we ended up in settings
    await expect(window.locator('#view-settings')).toBeVisible();
  });
});
