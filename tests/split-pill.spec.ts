import { test, expect } from '@playwright/test';

test.describe('Split Pill Legend Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    // Wait for legend to be created
    await page.waitForSelector('#czechDataContainer-legend');
    
    // Enable test numbers to see split pills
    const showTestNumbersCheckbox = page.locator('#showTestNumbers');
    const isChecked = await showTestNumbersCheckbox.isChecked();
    if (!isChecked) {
      await showTestNumbersCheckbox.check();
      await page.waitForTimeout(200);
    }
  });

  test('should display split pills for positive/negative test pairs', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Look for split pill structure - should have span wrappers containing multiple child spans
    const splitPills = czechLegend.locator('span > span').filter({ hasText: /Positive Tests|Negative Tests/ });
    const count = await splitPills.count();
    
    // Should have at least one split pill (for Antigen or PCR positivity)
    expect(count).toBeGreaterThan(0);
  });

  test('should toggle both tests when clicking prefix button', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Find a split pill structure by looking for "Positivity" text in a gray background span
    const prefixButtons = czechLegend.locator('span').filter({ hasText: /Positivity/ });
    const firstPrefix = prefixButtons.first();
    
    // Get the parent pill wrapper
    const pillWrapper = firstPrefix.locator('xpath=..');
    
    // Click the prefix to hide both
    await firstPrefix.click();
    await page.waitForTimeout(200);
    
    // Check that pill wrapper has reduced opacity
    const opacityHidden = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacityHidden).toBe('0.5');
    
    // Check that pill wrapper has strikethrough
    const textDecorationHidden = await pillWrapper.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationHidden).toContain('line-through');
    
    // Click prefix again to show both
    await firstPrefix.click();
    await page.waitForTimeout(200);
    
    // Check that pill wrapper opacity is back to normal
    const opacityVisible = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacityVisible).toBe('1');
    
    // Check that pill wrapper has no strikethrough
    const textDecorationVisible = await pillWrapper.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationVisible).not.toContain('line-through');
  });

  test('should toggle individual test when clicking positive/negative button', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Find buttons with "Positive Tests" text
    const positiveButtons = czechLegend.locator('span').filter({ hasText: 'Positive Tests' });
    const firstPositiveButton = positiveButtons.first();
    
    // Get the parent pill wrapper
    const pillWrapper = firstPositiveButton.locator('xpath=../..');
    
    // Click the positive tests button to hide it
    await firstPositiveButton.click();
    await page.waitForTimeout(200);
    
    // Check that the positive button has strikethrough
    const positiveTextDecoration = await firstPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(positiveTextDecoration).toContain('line-through');
    
    // Check that pill wrapper still has full opacity (negative is still visible)
    const opacityOneHidden = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacityOneHidden).toBe('1');
    
    // Check that pill wrapper has NO strikethrough (at least one visible)
    const textDecorationOneHidden = await pillWrapper.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationOneHidden).not.toContain('line-through');
    
    // Click positive button again to re-enable
    await firstPositiveButton.click();
    await page.waitForTimeout(200);
    
    // Check that positive button no longer has strikethrough
    const positiveTextDecorationVisible = await firstPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(positiveTextDecorationVisible).not.toContain('line-through');
  });

  test('should show reduced opacity and strikethrough only when both tests are hidden', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Find buttons with test labels
    const positiveButtons = czechLegend.locator('span').filter({ hasText: 'Positive Tests' });
    const negativeButtons = czechLegend.locator('span').filter({ hasText: 'Negative Tests' });
    
    const firstPositiveButton = positiveButtons.first();
    const firstNegativeButton = negativeButtons.first();
    
    // Get the parent pill wrapper
    const pillWrapper = firstPositiveButton.locator('xpath=../..');
    
    // Hide positive tests
    await firstPositiveButton.click();
    await page.waitForTimeout(200);
    
    // Pill should still have full opacity (negative still visible)
    let opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    
    // Now hide negative tests too
    await firstNegativeButton.click();
    await page.waitForTimeout(200);
    
    // Now pill should have reduced opacity (both hidden)
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('0.5');
    
    // And pill should have strikethrough
    const textDecoration = await pillWrapper.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Re-enable positive
    await firstPositiveButton.click();
    await page.waitForTimeout(200);
    
    // Pill should go back to full opacity (one visible)
    opacity = await pillWrapper.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    
    // And no strikethrough
    const textDecorationOneVisible = await pillWrapper.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecorationOneVisible).not.toContain('line-through');
  });

  test('should persist split pill visibility state in localStorage', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Find and click a positive tests button
    const positiveButtons = czechLegend.locator('span').filter({ hasText: 'Positive Tests' });
    const firstPositiveButton = positiveButtons.first();
    
    await firstPositiveButton.click();
    await page.waitForTimeout(200);
    
    // Verify it has strikethrough
    let textDecoration = await firstPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#czechDataContainer-legend');
    await page.waitForTimeout(500);
    
    // Re-enable test numbers if needed
    const showTestNumbersCheckbox = page.locator('#showTestNumbers');
    const isChecked = await showTestNumbersCheckbox.isChecked();
    if (!isChecked) {
      await showTestNumbersCheckbox.check();
      await page.waitForTimeout(200);
    }
    
    // Find the same button again
    const reloadedLegend = page.locator('#czechDataContainer-legend');
    const reloadedPositiveButtons = reloadedLegend.locator('span').filter({ hasText: 'Positive Tests' });
    const reloadedFirstPositiveButton = reloadedPositiveButtons.first();
    
    // Should still have strikethrough
    textDecoration = await reloadedFirstPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
  });

  test('should work in Czech language', async ({ page }) => {
    // Switch to Czech
    const languageSelect = page.locator('#languageSelect');
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Look for Czech test labels "pozitivní testy" and "negativní testy"
    const positiveButtons = czechLegend.locator('span').filter({ hasText: /pozitivní testy/i });
    const negativeButtons = czechLegend.locator('span').filter({ hasText: /negativní testy/i });
    
    // Should find split pill buttons
    expect(await positiveButtons.count()).toBeGreaterThan(0);
    expect(await negativeButtons.count()).toBeGreaterThan(0);
    
    // Test clicking
    const firstPositiveButton = positiveButtons.first();
    await firstPositiveButton.click();
    await page.waitForTimeout(200);
    
    // Should have strikethrough
    const textDecoration = await firstPositiveButton.evaluate(el => window.getComputedStyle(el).textDecoration);
    expect(textDecoration).toContain('line-through');
  });
});
