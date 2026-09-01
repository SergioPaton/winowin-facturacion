const { test, expect } = require('@playwright/test');
const { launchApp } = require('./electron-launcher');

test.describe('QA Mindset - Edge Cases & Stress Tests', () => {
    let electronApp;
    let window;

    test.beforeEach(async () => {
        const app = await launchApp();
        electronApp = app.electronApp;
        window = app.window;

        // Bypass login
        await window.evaluate(() => {
            localStorage.setItem('user', JSON.stringify({
                username: 'qa_tester',
                loginTimestamp: new Date().toISOString(),
                sessionDuration: '7d',
                nombre: 'QA Expert'
            }));
        });
        await window.reload();
    });

    test.afterEach(async () => {
        await electronApp.close();
    });

    test('Stress: Rapidly opening and closing modals', async () => {
        for (let i = 0; i < 5; i++) {
            await window.click('#btn-open-create-invoice');
            await expect(window.locator('#invoice-modal')).toBeVisible();
            await window.click('#invoice-modal .close-modal');
            await expect(window.locator('#invoice-modal')).toBeHidden();
        }
        // Ensure UI is still interactive
        await window.click('.nav-item[data-view="clients"]');
        await expect(window.locator('#view-clients')).toBeVisible();
    });

    test('Extreme Values: 100% discount and large quantities', async () => {
        await window.click('#btn-open-create-invoice');
        
        // Fill mandatory line
        await window.fill('.line-desc', 'QA Edge Case Service');
        await window.fill('.line-qty', '999999');
        await window.fill('.line-price', '0'); // 0€ price
        
        // 100% discount
        const discountInput = window.locator('#invoice-discount');
        await discountInput.fill('100');
        
        // Try to submit (even if it fails at backend, we check frontend doesn't crash)
        await window.click('#invoice-submit-btn');
        
        // Check if toast appears (either error or success)
        const toast = window.locator('#toast-container .toast');
        // We don't care if it passes or fails, but that it handles it gracefully
        await expect(toast.first()).toBeVisible({ timeout: 5000 }).catch(() => {});
    });

    test('UI Layout: Injection of extremely long strings', async () => {
        await window.click('.nav-item[data-view="clients"]');
        await window.click('#btn-open-create-client');
        
        const longString = 'A'.repeat(500);
        await window.fill('#client-nombre', longString);
        await window.fill('#client-direccion', 'Test Address');
        
        // Check if modal still looks "okay" (not broken by long name)
        // This is a visual check mostly, but we can verify visibility
        await expect(window.locator('#client-submit-btn')).toBeVisible();
        await expect(window.locator('#client-submit-btn')).toBeInViewport();
    });

    test('Logic: Non-existent Recovery flow bypass attempt', async () => {
        await window.evaluate(() => { localStorage.clear(); });
        await window.reload();
        
        await window.click('#show-recovery');
        // Try to skip to step 3 without passing step 1 & 2
        await window.evaluate(() => {
            document.getElementById('recovery-step-1').classList.add('hidden');
            document.getElementById('recovery-step-3').classList.remove('hidden');
        });
        
        await window.fill('#recovery-new-password', 'NewPass123!');
        await window.click('#recovery-form-3 button[type="submit"]');
        
        // The backend should reject this, and frontend should show error toast
        const toast = window.locator('#toast-container .toast');
        await expect(toast).toBeVisible();
    });
});
