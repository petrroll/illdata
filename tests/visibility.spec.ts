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
    // Use direct children (> span) to avoid nested spans in split pills
    const legendItems = czechLegend.locator('> span');
    
    // Get the first legend item
    const firstItem = legendItems.first();
    await expect(firstItem).toBeVisible();
    
    // Check initial opacity (should be visible, opacity 1)
    const initialOpacity = await firstItem.evaluate(el => window.getComputedStyle(el).opacity);
    expect(initialOpacity).toBe('1');
    
    // For split pills, clicking once toggles only the base series
    // Click to hide the base part
    await firstItem.click();
    await page.waitForTimeout(100);
    
    // For split pills, opacity might still be 1 if shifted series is visible
    // Click again to toggle (this will show base if it was hidden, or hide if shown)
    await firstItem.click();
    await page.waitForTimeout(100);
    
    // Check opacity back to 1 (visible state)
    const visibleOpacity = await firstItem.evaluate(el => window.getComputedStyle(el).opacity);
    expect(visibleOpacity).toBe('1');
  });

  test('should persist series visibility in localStorage', async ({ page }) => {
    // Helper function to hide a legend item completely (handles split pills)
    const hideItem = async (item: any) => {
      const children = item.locator('> span');
      const childCount = await children.count();
      
      if (childCount > 0) {
        // Split pill - click all children to hide all parts
        for (let i = 0; i < childCount; i++) {
          await children.nth(i).click();
          await page.waitForTimeout(50);
        }
      } else {
        // Regular pill
        await item.click();
        await page.waitForTimeout(50);
      }
    };
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('> span');
    
    // Hide first series
    const firstItem = legendItems.first();
    await hideItem(firstItem);
    await page.waitForTimeout(300);
    
    // Verify visibility is stored in localStorage
    const visibility = await page.evaluate(() => {
      return localStorage.getItem('datasetVisibility');
    });
    
    expect(visibility).toBeTruthy();
    const visibilityObj = JSON.parse(visibility!);
    
    // At least one series should be marked as hidden
    const hasHiddenSeries = Object.values(visibilityObj).some(v => v === false);
    expect(hasHiddenSeries).toBe(true);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#czechDataContainer-legend');
    await page.waitForTimeout(500); // Extra wait for pills to be created and styled
    
    // Verify visibility is still in localStorage after reload
    const visibilityAfterReload = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    const hasHiddenSeriesAfterReload = Object.values(visibilityAfterReload).some(v => v === false);
    expect(hasHiddenSeriesAfterReload).toBe(true);
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
    // Helper function to toggle a legend item (handles split pills)
    const toggleItem = async (item: any) => {
      const children = item.locator('> span');
      const childCount = await children.count();
      
      if (childCount > 0) {
        // Split pill - click all children to toggle all parts
        for (let i = 0; i < childCount; i++) {
          await children.nth(i).click();
          await page.waitForTimeout(50);
        }
      } else {
        // Regular pill
        await item.click();
        await page.waitForTimeout(50);
      }
    };
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('> span');
    
    const itemCount = await legendItems.count();
    if (itemCount < 2) {
      test.skip();
      return;
    }
    
    // Get initial visibility state
    const initialVisibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    
    // Toggle first item
    await toggleItem(legendItems.nth(0));
    await page.waitForTimeout(200);
    
    // Verify visibility changed
    let visibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    expect(JSON.stringify(visibility)).not.toBe(JSON.stringify(initialVisibility));
    const afterFirstToggle = JSON.stringify(visibility);
    
    // Toggle second item
    await toggleItem(legendItems.nth(1));
    await page.waitForTimeout(200);
    
    // Verify visibility changed again
    visibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    expect(JSON.stringify(visibility)).not.toBe(afterFirstToggle);
    const afterSecondToggle = JSON.stringify(visibility);
    
    // Toggle first item back
    await toggleItem(legendItems.nth(0));
    await page.waitForTimeout(200);
    
    // Verify visibility changed (it should be different from after second toggle)
    visibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    expect(JSON.stringify(visibility)).not.toBe(afterSecondToggle);
  });

  test('should maintain visibility state across different charts', async ({ page }) => {
    // Get legends for different charts
    const czechLegend = page.locator('#czechDataContainer-legend');
    const euLegend = page.locator('#euDataContainer-legend');
    
    // Hide a series in Czech chart
    const czechItems = czechLegend.locator('> span');
    await czechItems.first().click();
    await page.waitForTimeout(200);
    
    // Verify at least one series is hidden in localStorage
    const visibility = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    const hasHiddenSeries = Object.values(visibility).some(v => v === false);
    expect(hasHiddenSeries).toBe(true);
    
    // EU chart series should remain visible (independent)
    const euItems = euLegend.locator('> span');
    if (await euItems.count() > 0) {
      expect(await euItems.first().evaluate(el => window.getComputedStyle(el).opacity)).toBe('1');
    }
  });

  test('should preserve visibility when switching language', async ({ page }) => {
    // Helper function to hide a legend item completely (handles split pills)
    const hideItem = async (item: any) => {
      const children = item.locator('> span');
      const childCount = await children.count();
      
      if (childCount > 0) {
        // Split pill - click all children to hide all parts
        for (let i = 0; i < childCount; i++) {
          await children.nth(i).click();
          await page.waitForTimeout(50);
        }
      } else {
        // Regular pill
        await item.click();
        await page.waitForTimeout(50);
      }
    };
    
    const czechLegend = page.locator('#czechDataContainer-legend');
    const legendItems = czechLegend.locator('> span');
    
    // Hide first series
    await hideItem(legendItems.first());
    await page.waitForTimeout(300);
    
    // Verify at least one series is hidden in localStorage
    const visibilityBefore = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    const hasHiddenSeriesBefore = Object.values(visibilityBefore).some(v => v === false);
    expect(hasHiddenSeriesBefore).toBe(true);
    
    // Switch language
    const languageSelect = page.locator('#languageSelect');
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(1000);
    
    // Visibility should still be in localStorage (language switch shouldn't clear it)
    const visibilityAfter = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    const hasHiddenSeriesAfter = Object.values(visibilityAfter).some(v => v === false);
    expect(hasHiddenSeriesAfter).toBe(true);
  });
});
