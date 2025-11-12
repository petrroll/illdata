import { test, expect } from '@playwright/test';

test.describe('Shift and Alignment Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should have alignment mode selector with three options', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    await expect(alignSelect).toBeVisible();
    
    // Check all three options exist
    const options = alignSelect.locator('option');
    await expect(options).toHaveCount(3);
    
    // Verify option values exist in the select
    await expect(alignSelect.locator('option[value="days"]')).toHaveCount(1);
    await expect(alignSelect.locator('option[value="maxima"]')).toHaveCount(1);
    await expect(alignSelect.locator('option[value="minima"]')).toHaveCount(1);
  });

  test('should default to maxima alignment mode', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    await expect(alignSelect).toHaveValue('maxima');
  });

  test('should have shift value input', async ({ page }) => {
    const shiftInput = page.locator('#shiftOverrideInput');
    await expect(shiftInput).toBeVisible();
    await expect(shiftInput).toHaveAttribute('type', 'number');
  });

  test('should switch between alignment modes', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    
    // Switch to days mode
    await alignSelect.selectOption('days');
    await page.waitForTimeout(300);
    await expect(alignSelect).toHaveValue('days');
    
    // Switch to minima mode
    await alignSelect.selectOption('minima');
    await page.waitForTimeout(300);
    await expect(alignSelect).toHaveValue('minima');
    
    // Switch back to maxima
    await alignSelect.selectOption('maxima');
    await page.waitForTimeout(300);
    await expect(alignSelect).toHaveValue('maxima');
  });

  test('should update shift value input when changing alignment mode', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    const shiftInput = page.locator('#shiftOverrideInput');
    
    // Start with maxima (default value should be 1)
    await expect(alignSelect).toHaveValue('maxima');
    await expect(shiftInput).toHaveValue('1');
    
    // Switch to days mode (should reset to 0)
    await alignSelect.selectOption('days');
    await page.waitForTimeout(300);
    await expect(shiftInput).toHaveValue('0');
    
    // Switch back to maxima (should reset to 1)
    await alignSelect.selectOption('maxima');
    await page.waitForTimeout(300);
    await expect(shiftInput).toHaveValue('1');
  });

  test('should change shift value and update charts', async ({ page }) => {
    const shiftInput = page.locator('#shiftOverrideInput');
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Get initial legend items
    const initialCount = await czechLegend.locator('span').count();
    
    // Change shift value
    await shiftInput.fill('2');
    await shiftInput.press('Enter');
    await page.waitForTimeout(500);
    
    // Legend should still exist (structure maintained)
    const afterChangeCount = await czechLegend.locator('span').count();
    expect(afterChangeCount).toBe(initialCount);
    
    // Verify input value changed
    await expect(shiftInput).toHaveValue('2');
  });

  test('should accept negative shift values in days mode', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    const shiftInput = page.locator('#shiftOverrideInput');
    
    // Switch to days mode
    await alignSelect.selectOption('days');
    await page.waitForTimeout(200);
    
    // Enter negative value
    await shiftInput.fill('-180');
    await shiftInput.press('Enter');
    await page.waitForTimeout(300);
    
    // Verify negative value accepted
    await expect(shiftInput).toHaveValue('-180');
  });

  test('should not accept negative values in maxima/minima modes', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    const shiftInput = page.locator('#shiftOverrideInput');
    
    // Ensure we're in maxima mode
    await alignSelect.selectOption('maxima');
    await page.waitForTimeout(200);
    
    // Try to enter negative value (should be clamped to 1)
    await shiftInput.fill('-5');
    await shiftInput.press('Enter');
    await page.waitForTimeout(300);
    
    // Value should be clamped to minimum 1
    const value = await shiftInput.inputValue();
    expect(parseInt(value)).toBeGreaterThanOrEqual(1);
  });

  test('should persist shift settings in localStorage', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    const shiftInput = page.locator('#shiftOverrideInput');
    
    // Change alignment mode to minima and shift value to 3
    await alignSelect.selectOption('minima');
    await shiftInput.fill('3');
    await shiftInput.press('Enter');
    await page.waitForTimeout(300);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#alignByExtremeSelect');
    
    // Verify settings persisted
    await expect(alignSelect).toHaveValue('minima');
    await expect(shiftInput).toHaveValue('3');
  });

  test('should update legends when changing alignment mode', async ({ page }) => {
    const alignSelect = page.locator('#alignByExtremeSelect');
    const czechLegend = page.locator('#czechDataContainer-legend');
    
    // Enable shifted series to see the effect
    await page.locator('#showShiftedCheckbox').check();
    await page.waitForTimeout(200);
    
    // Switch alignment mode
    await alignSelect.selectOption('days');
    await page.waitForTimeout(500);
    
    // Legend should still exist and have items
    const items = czechLegend.locator('span');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should maintain series visibility when changing shift mode', async ({ page }) => {
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
    
    // Hide a series
    await hideItem(legendItems.first());
    await page.waitForTimeout(200);
    
    // Verify at least one series is hidden
    const visibilityBefore = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('datasetVisibility') || '{}');
    });
    const hasHiddenSeriesBefore = Object.values(visibilityBefore).some(v => v === false);
    expect(hasHiddenSeriesBefore).toBe(true);
    
    // Change alignment mode
    const alignSelect = page.locator('#alignByExtremeSelect');
    await alignSelect.selectOption('days');
    await page.waitForTimeout(500);
    
    // Re-fetch legend items
    const updatedLegend = page.locator('#czechDataContainer-legend');
    const updatedItems = updatedLegend.locator('> span');
    
    // At least one series should still be hidden
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

  test('should work in Czech language', async ({ page }) => {
    // Switch to Czech
    await page.locator('#languageSelect').selectOption('cs');
    await page.waitForTimeout(500);
    
    // Controls should still work
    const alignSelect = page.locator('#alignByExtremeSelect');
    await alignSelect.selectOption('days');
    await page.waitForTimeout(300);
    await expect(alignSelect).toHaveValue('days');
    
    const shiftInput = page.locator('#shiftOverrideInput');
    await shiftInput.fill('100');
    await shiftInput.press('Enter');
    await page.waitForTimeout(300);
    await expect(shiftInput).toHaveValue('100');
  });
});
