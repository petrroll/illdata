import { test, expect } from '@playwright/test';

test.describe('Future Data Projection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should respect Include Future Data checkbox state', async ({ page }) => {
    // Test that the checkbox exists and can be toggled
    const includeFutureCheckbox = page.locator('#includeFutureCheckbox');
    await expect(includeFutureCheckbox).toBeVisible();
    
    // Check initial state (should be unchecked by default)
    await expect(includeFutureCheckbox).not.toBeChecked();
    
    // Toggle to checked
    await includeFutureCheckbox.check();
    await page.waitForTimeout(300);
    await expect(includeFutureCheckbox).toBeChecked();
    
    // Toggle back to unchecked
    await includeFutureCheckbox.uncheck();
    await page.waitForTimeout(300);
    await expect(includeFutureCheckbox).not.toBeChecked();
  });

  test('should update chart when Include Future Data is toggled with time range', async ({ page }) => {
    // Select a specific time range
    const timeRangeSelect = page.locator('#timeRangeSelect');
    await timeRangeSelect.selectOption('90');
    await page.waitForTimeout(300);
    
    // Get initial canvas state
    const czechCanvas = page.locator('#czechDataContainer canvas');
    await expect(czechCanvas).toBeVisible();
    
    // Enable "Include Future Data"
    const includeFutureCheckbox = page.locator('#includeFutureCheckbox');
    await includeFutureCheckbox.check();
    await page.waitForTimeout(500); // Wait for chart update
    
    // Canvas should still be visible after update
    await expect(czechCanvas).toBeVisible();
    
    // Check that the canvas was re-rendered (it should have chart content)
    const canvasContent = await czechCanvas.evaluate((canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Check if there's any non-transparent pixel
      for (let i = 3; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0) return true;
      }
      return false;
    });
    expect(canvasContent, 'Canvas should have chart content').toBe(true);
  });

  test('should work with different time ranges when Include Future Data is enabled', async ({ page }) => {
    const includeFutureCheckbox = page.locator('#includeFutureCheckbox');
    const timeRangeSelect = page.locator('#timeRangeSelect');
    
    // Enable future data
    await includeFutureCheckbox.check();
    await page.waitForTimeout(300);
    
    // Test different time ranges
    const timeRanges = ['30', '90', '180', '365'];
    
    for (const range of timeRanges) {
      await timeRangeSelect.selectOption(range);
      await page.waitForTimeout(400);
      
      // Verify charts are still visible and functional
      await expect(page.locator('#czechDataContainer canvas')).toBeVisible();
      await expect(page.locator('#euDataContainer canvas')).toBeVisible();
      await expect(page.locator('#deWastewaterContainer canvas')).toBeVisible();
    }
  });

  test('should persist Include Future Data state across time range changes', async ({ page }) => {
    const includeFutureCheckbox = page.locator('#includeFutureCheckbox');
    const timeRangeSelect = page.locator('#timeRangeSelect');
    
    // Enable future data
    await includeFutureCheckbox.check();
    await page.waitForTimeout(300);
    await expect(includeFutureCheckbox).toBeChecked();
    
    // Change time range
    await timeRangeSelect.selectOption('90');
    await page.waitForTimeout(300);
    
    // Checkbox should still be checked
    await expect(includeFutureCheckbox).toBeChecked();
    
    // Change time range again
    await timeRangeSelect.selectOption('365');
    await page.waitForTimeout(300);
    
    // Checkbox should still be checked
    await expect(includeFutureCheckbox).toBeChecked();
  });

  test('should persist Include Future Data state in localStorage', async ({ page }) => {
    const includeFutureCheckbox = page.locator('#includeFutureCheckbox');
    
    // Enable future data
    await includeFutureCheckbox.check();
    await page.waitForTimeout(300);
    
    // Check localStorage
    const storedValue = await page.evaluate(() => {
      const settings = localStorage.getItem('appSettings');
      if (!settings) return null;
      return JSON.parse(settings).includeFuture;
    });
    
    expect(storedValue).toBe(true);
    
    // Reload page
    await page.reload();
    await page.waitForSelector('#includeFutureCheckbox');
    
    // Checkbox should still be checked after reload
    await expect(includeFutureCheckbox).toBeChecked();
  });

  test('should work with "All Time" time range', async ({ page }) => {
    const includeFutureCheckbox = page.locator('#includeFutureCheckbox');
    const timeRangeSelect = page.locator('#timeRangeSelect');
    
    // Enable future data
    await includeFutureCheckbox.check();
    await page.waitForTimeout(300);
    
    // Select "All Time"
    await timeRangeSelect.selectOption('all');
    await page.waitForTimeout(500);
    
    // Charts should still be visible
    await expect(page.locator('#czechDataContainer canvas')).toBeVisible();
    await expect(page.locator('#euDataContainer canvas')).toBeVisible();
    await expect(page.locator('#deWastewaterContainer canvas')).toBeVisible();
    
    // Switch back to a specific time range
    await timeRangeSelect.selectOption('90');
    await page.waitForTimeout(500);
    
    // Charts should still be visible
    await expect(page.locator('#czechDataContainer canvas')).toBeVisible();
  });
});
