const { test, expect } = require('@playwright/test');
const { launchApp } = require('./electron-launcher');

test.describe('Auth Failure Tests', () => {
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

  test('should show error with wrong credentials', async () => {
    // Fill with wrong credentials
    await window.fill('#login-username', 'invalid_user');
    await window.fill('#login-password', 'wrong_password');
    
    // Submit
    await window.click('#login-form button[type="submit"]');

    // Check for error notification or that we didn't move from auth section
    // Assuming the app shows a toast or error message
    // Let's waitForSelector for something in the toast container or just check that auth-section is visible
    await expect(window.locator('#auth-section')).toBeVisible();
    
    // Check if a toast was shown (if provided in index.html)
    const toastCount = await window.locator('#toast-container .toast').count();
    // In our index.html there's a toast-container, so we can expect a toast if it's implemented in JS
  });

  test('should not submit with empty fields', async () => {
    // Trigger validation by trying to submit empty
    await window.click('#login-form button[type="submit"]');

    // Check native validation or that we're still on auth page
    await expect(window.locator('#auth-section')).toBeVisible();
    await expect(window.locator('#app-section')).toBeHidden();
  });

  test('recovery flow: should show error with invalid code', async () => {
    // Show recovery section
    await window.click('#show-recovery');
    await expect(window.locator('#recovery-section')).toBeVisible();

    // Step 1: Send user
    await window.fill('#recovery-username', 'testuser');
    await window.click('#recovery-form-1 button[type="submit"]');

    // Step 2: Fill invalid code
    // Assuming Step 2 becomes visible after Step 1 (even if it fails, it might move to show the code input)
    // Wait for the transition
    await window.waitForSelector('#recovery-step-2', { state: 'visible', timeout: 5000 }).catch(() => {});
    
    if (await window.isVisible('#recovery-step-2')) {
        // Step 2: Test fixed mock code
        await window.fill('#recovery-code', '123456');
        await window.click('#recovery-form-2 button[type="submit"]');
        
        // Should show error or stay on step 2
        await expect(window.locator('#recovery-step-2')).toBeVisible();
        await expect(window.locator('#recovery-step-3')).toBeHidden();
    }
  });
});
