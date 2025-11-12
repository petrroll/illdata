import { test, expect } from '@playwright/test';

test.describe('Series Visibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    // Wait for legend to be created
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should toggle individual series visibility by clicking legend item', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    
    // Get the first legend item
    const firstItem = legendItems.first();
    await expect(firstItem).toBeVisible();
    
    // Check initial opacity (should be visible, opacity 1)
    const initialOpacity = await firstItem.evaluate(el => window.getComputedStyle(el).opacity);
    expect(initialOpacity).toBe('1');
    
    // Click to hide
    await firstItem.click();
    await page.waitForTimeout(100);
    
    // Check opacity changed to 0.5 (hidden state)
    const hiddenOpacity = await firstItem.evaluate(el => window.getComputedStyle(el).opacity);
    expect(hiddenOpacity).toBe('0.5');
    
    // Click again to show
    await firstItem.click();
    await page.waitForTimeout(100);
    
    // Check opacity back to 1
    const visibleOpacity = await firstItem.evaluate(el => window.getComputedStyle(el).opacity);
    expect(visibleOpacity).toBe('1');
  });

  test('should persist series visibility in localStorage', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    
    // Hide first series
    const firstItem = legendItems.first();
    await firstItem.click();
    await page.waitForTimeout(100);
    
    // Verify it's hidden
    const hiddenOpacity = await firstItem.evaluate(el => window.getComputedStyle(el).opacity);
    expect(hiddenOpacity).toBe('0.5');
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#czechDataContainer-legend');
    
    // Verify series is still hidden
    const reloadedLegend = page.locator('#czechDataContainer-legend');
    const reloadedItems = reloadedLegend.locator('span');
    const firstItemAfterReload = reloadedItems.first();
    const opacity = await firstItemAfterReload.evaluate(el => window.getComputedStyle(el).opacity);
    expect(opacity).toBe('0.5');
  });

  test('should hide all series when Hide All button is clicked', async ({ page }) => {
    const hideAllButton = page.locator('#hideAllButton');
    await hideAllButton.click();
    await page.waitForTimeout(200);
    
    // Check all legend items in all charts are hidden
    // Use direct children (> span) to avoid nested spans in split pills
    const allLegends = page.locator('[id$="-legend"]');
    const count = await allLegends.count();
    
    for (let i = 0; i < count; i++) {
      const legend = allLegends.nth(i);
      const items = legend.locator('> span');
      const itemCount = await items.count();
      
      for (let j = 0; j < itemCount; j++) {
        const item = items.nth(j);
        const opacity = await item.evaluate(el => window.getComputedStyle(el).opacity);
        expect(opacity).toBe('0.5');
      }
    }
  });

  test('should toggle multiple series independently', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    // Use direct children (> span) to avoid nested spans in split pills
    const legendItems = czechLegend.locator('> span');
    
    const itemCount = await legendItems.count();
    if (itemCount < 2) {
      test.skip();
      return;
    }
    
    // Hide first series
    await legendItems.nth(0).click();
    await page.waitForTimeout(100);
    
    // Hide second series
    await legendItems.nth(1).click();
    await page.waitForTimeout(100);
    
    // Verify both are hidden
    expect(await legendItems.nth(0).evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    expect(await legendItems.nth(1).evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    
    // Show first series back
    await legendItems.nth(0).click();
    await page.waitForTimeout(100);
    
    // Verify first is visible, second still hidden
    expect(await legendItems.nth(0).evaluate(el => window.getComputedStyle(el).opacity)).toBe('1');
    expect(await legendItems.nth(1).evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
  });

  test('should maintain visibility state across different charts', async ({ page }) => {
    // Get legends for different charts
    const czechLegend = page.locator('#czechDataContainer-legend');
    const euLegend = page.locator('#euDataContainer-legend');
    
    // Hide a series in Czech chart
    const czechItems = czechLegend.locator('span');
    await czechItems.first().click();
    await page.waitForTimeout(100);
    
    // Verify it's hidden
    expect(await czechItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    
    // EU chart series should remain visible (independent)
    const euItems = euLegend.locator('span');
    if (await euItems.count() > 0) {
      expect(await euItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('1');
    }
  });

  test('should preserve visibility when switching language', async ({ page }) => {
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('span');
    
    // Hide first series
    await legendItems.first().click();
    await page.waitForTimeout(100);
    
    // Verify hidden
    expect(await legendItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('0.5');
    
    // Switch language
    const languageSelect = page.locator('#languageSelect');
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);
    
    // Re-fetch legend items after language change
    const updatedLegend = page.locator('#czechDataContainer-legend');
    const updatedItems = updatedLegend.locator('span');
    
    // The same series should still be hidden (visibility preserved by base name)
    // Note: We can't match by exact text since it changed to Czech, so check if ANY item is hidden
    let hasHiddenItem = false;
    const count = await updatedItems.count();
    for (let i = 0; i < count; i++) {
      const opacity = await updatedItems.nth(i).evaluate(el => window.getComputedStyle(el).opacity);
      if (opacity === '0.5') {
        hasHiddenItem = true;
        break;
      }
    }
    expect(hasHiddenItem).toBe(true);
  });
});
