import { test, expect } from '@playwright/test';

test.describe('Split Pill Legend Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#languageSelect', { timeout: 10000 });
    await page.waitForSelector('canvas', { timeout: 10000 });
    // Wait for legend to be created
    await page.waitForSelector('#czechDataContainer-legend', { timeout: 10000 });
    
    // Ensure test numbers are enabled
    const showTestNumbersCheckbox = page.locator('#showTestNumbersCheckbox');
    await showTestNumbersCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    const isChecked = await showTestNumbersCheckbox.isChecked();
    if (!isChecked) {
      await showTestNumbersCheckbox.check();
      await page.waitForTimeout(1000); // Wait for UI to update
    }
  });

  test('should display split pills for positive/negative test pairs', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Wait a bit for legend to be fully rendered
    await page.waitForTimeout(500);
    
    // Look for text that indicates split pills exist
    const positiveTestsText = czechLegend.locator('span', { hasText: 'Positive Tests' });
    const negativeTestsText = czechLegend.locator('span', { hasText: 'Negative Tests' });
    
    // Should have at least one occurrence of each
    await expect(positiveTestsText.first()).toBeVisible({ timeout: 5000 });
    await expect(negativeTestsText.first()).toBeVisible({ timeout: 5000 });
  });

  test('should toggle both tests when clicking prefix button', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Wait for legend to be fully rendered
    await page.waitForTimeout(1000);
    
    // Find "Antigen Positivity" or "PCR Positivity" text (these are the prefix buttons)
    const antigenPrefix = czechLegend.locator('span', { hasText: /^Antigen Positivity$/ });
    
    // Check if it exists
    const count = await antigenPrefix.count();
    if (count === 0) {
      test.skip();
      return;
    }
    
    const firstPrefix = antigenPrefix.first();
    await firstPrefix.waitFor({ state: 'visible', timeout: 5000 });
    
    // Scroll into view and click
    await firstPrefix.scrollIntoViewIfNeeded();
    await firstPrefix.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Find the positive test button and check for strikethrough
    const positiveButton = czechLegend.locator('span', { hasText: 'Positive Tests' }).first();
    await positiveButton.waitFor({ state: 'visible', timeout: 5000 });
    const textDecoration = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Click prefix again to show both
    await firstPrefix.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Now should not have strikethrough
    const textDecorationVisible = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationVisible).not.toContain('line-through');
  });

  test('should toggle individual test when clicking positive/negative button', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Wait for legend rendering
    await page.waitForTimeout(1000);
    
    // Find the first "Positive Tests" button
    const positiveButton = czechLegend.locator('span', { hasText: 'Positive Tests' }).first();
    await positiveButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Click to hide positive tests
    await positiveButton.scrollIntoViewIfNeeded();
    await positiveButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Check that it has strikethrough
    const textDecoration = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Click again to re-enable
    await positiveButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Check that strikethrough is removed
    const textDecorationVisible = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationVisible).not.toContain('line-through');
  });

  test('should show reduced opacity only when both tests are hidden', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Wait for legend rendering
    await page.waitForTimeout(1000);
    
    const positiveButton = czechLegend.locator('span', { hasText: 'Positive Tests' }).first();
    const negativeButton = czechLegend.locator('span', { hasText: 'Negative Tests' }).first();
    
    await positiveButton.waitFor({ state: 'visible', timeout: 5000 });
    await negativeButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Get parent element (the pill wrapper) by going up the DOM
    const pillWrapper = positiveButton.locator('xpath=../..');
    
    // Initially both visible, opacity should be 1
    let opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    
    // Hide positive tests
    await positiveButton.scrollIntoViewIfNeeded();
    await positiveButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Opacity should still be 1 (negative still visible)
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    
    // Now hide negative tests too
    await negativeButton.scrollIntoViewIfNeeded();
    await negativeButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Now opacity should be 0.5 (both hidden)
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('0.5');
    
    // Re-enable positive
    await positiveButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Opacity should go back to 1
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
  });

  test('should persist split pill visibility state in localStorage', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Wait for rendering
    await page.waitForTimeout(1000);
    
    // Click a positive tests button
    const positiveButton = czechLegend.locator('span', { hasText: 'Positive Tests' }).first();
    await positiveButton.waitFor({ state: 'visible', timeout: 5000 });
    await positiveButton.scrollIntoViewIfNeeded();
    await positiveButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Verify it has strikethrough
    let textDecoration = await positiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('#czechDataContainer-legend', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Re-enable test numbers if needed
    const showTestNumbersCheckbox = page.locator('#showTestNumbersCheckbox');
    await showTestNumbersCheckbox.waitFor({ state: 'visible', timeout: 5000 });
    const isChecked = await showTestNumbersCheckbox.isChecked();
    if (!isChecked) {
      await showTestNumbersCheckbox.check();
      await page.waitForTimeout(1000);
    }
    
    // Find the same button again
    const reloadedLegend = page.locator('#czechDataContainer-legend');
    const reloadedPositiveButton = reloadedLegend.locator('span', { hasText: 'Positive Tests' }).first();
    await reloadedPositiveButton.waitFor({ state: 'visible', timeout: 5000 });
    
    // Should still have strikethrough
    textDecoration = await reloadedPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
  });

  test('should work in Czech language', async ({ page }) => {
    // Switch to Czech
    const languageSelect = page.locator('#languageSelect');
    await languageSelect.waitFor({ state: 'visible', timeout: 5000 });
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(2000); // Wait longer for language change
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Look for Czech test labels - should contain "pozitivní" or "negativní"
    const positiveButtons = czechLegend.locator('span', { hasText: /pozitivní/i });
    const negativeButtons = czechLegend.locator('span', { hasText: /negativní/i });
    
    // Should find at least one of each
    await expect(positiveButtons.first()).toBeVisible({ timeout: 5000 });
    await expect(negativeButtons.first()).toBeVisible({ timeout: 5000 });
    
    // Test clicking
    const firstPositiveButton = positiveButtons.first();
    await firstPositiveButton.scrollIntoViewIfNeeded();
    await firstPositiveButton.click({ force: true });
    await page.waitForTimeout(1000);
    
    // Should have strikethrough
    const textDecoration = await firstPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
  });
});
