import { test, expect } from '@playwright/test';

test.describe('Tooltip Close Button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
  });

  test('should show tooltip on desktop when hovering over chart', async ({ page }) => {
    // Get the first canvas
    const canvas = page.locator('#czechPositivityChart').first();
    await expect(canvas).toBeVisible();
    
    // Hover over the canvas to trigger tooltip
    await canvas.hover({ position: { x: 200, y: 100 } });
    await page.waitForTimeout(300);
    
    // Check if custom tooltip appears
    const tooltip = page.locator('#czechPositivityChart-tooltip');
    await expect(tooltip).toBeVisible();
    
    // On desktop, tooltip should not have 'mobile' class
    const hasDesktopClass = await tooltip.evaluate(el => !el.classList.contains('mobile'));
    expect(hasDesktopClass).toBe(true);
    
    // Close button should be hidden on desktop
    const closeButton = tooltip.locator('.chart-tooltip-close');
    const closeButtonDisplay = await closeButton.evaluate(el => window.getComputedStyle(el).display);
    expect(closeButtonDisplay).toBe('none');
  });

  test('should show tooltip with close button on mobile viewport', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Get the first canvas
    const canvas = page.locator('#czechPositivityChart').first();
    await expect(canvas).toBeVisible();
    
    // Click on the canvas to trigger tooltip on mobile
    await canvas.click({ position: { x: 150, y: 100 } });
    await page.waitForTimeout(300);
    
    // Check if custom tooltip appears
    const tooltip = page.locator('#czechPositivityChart-tooltip');
    await expect(tooltip).toBeVisible();
    
    // On mobile, tooltip should have 'mobile' class
    const hasMobileClass = await tooltip.evaluate(el => el.classList.contains('mobile'));
    expect(hasMobileClass).toBe(true);
    
    // Close button should be visible on mobile
    const closeButton = tooltip.locator('.chart-tooltip-close');
    const closeButtonDisplay = await closeButton.evaluate(el => window.getComputedStyle(el).display);
    expect(closeButtonDisplay).toBe('flex');
    await expect(closeButton).toBeVisible();
  });

  test('should close tooltip when clicking close button on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Get the first canvas
    const canvas = page.locator('#czechPositivityChart').first();
    await expect(canvas).toBeVisible();
    
    // Click on the canvas to trigger tooltip
    await canvas.click({ position: { x: 150, y: 100 } });
    await page.waitForTimeout(300);
    
    // Verify tooltip is visible
    const tooltip = page.locator('#czechPositivityChart-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Get initial opacity
    const initialOpacity = await tooltip.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(initialOpacity)).toBeGreaterThan(0.5);
    
    // Click the close button
    const closeButton = tooltip.locator('.chart-tooltip-close');
    await closeButton.click();
    await page.waitForTimeout(500); // Wait for transition to complete
    
    // Tooltip should be hidden (opacity close to 0)
    const finalOpacity = await tooltip.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(finalOpacity)).toBeLessThan(0.1); // Allow for small floating point differences
  });

  test('should show tooltip content with title and data points', async ({ page }) => {
    // Get the first canvas
    const canvas = page.locator('#czechPositivityChart').first();
    await expect(canvas).toBeVisible();
    
    // Hover over the canvas
    await canvas.hover({ position: { x: 200, y: 100 } });
    await page.waitForTimeout(300);
    
    // Check if tooltip has title
    const tooltip = page.locator('#czechPositivityChart-tooltip');
    const tooltipTitle = tooltip.locator('.chart-tooltip-title');
    await expect(tooltipTitle).toBeVisible();
    
    // Check if tooltip has body with data
    const tooltipBody = tooltip.locator('.chart-tooltip-body');
    await expect(tooltipBody).toBeVisible();
    
    // Check if tooltip items exist
    const tooltipItems = tooltipBody.locator('.chart-tooltip-item');
    const itemCount = await tooltipItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test('should show color indicators for each series in tooltip', async ({ page }) => {
    // Get the first canvas
    const canvas = page.locator('#czechPositivityChart').first();
    await expect(canvas).toBeVisible();
    
    // Hover over the canvas
    await canvas.hover({ position: { x: 200, y: 100 } });
    await page.waitForTimeout(300);
    
    // Check if tooltip items have color indicators
    const tooltip = page.locator('#czechPositivityChart-tooltip');
    const colorIndicators = tooltip.locator('.chart-tooltip-color');
    const colorCount = await colorIndicators.count();
    expect(colorCount).toBeGreaterThan(0);
    
    // Verify color indicators have background colors
    const firstColor = colorIndicators.first();
    const bgColor = await firstColor.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
  });

  test('should reopen tooltip after closing it on mobile', async ({ page }) => {
    // Set viewport to mobile size
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Get the first canvas
    const canvas = page.locator('#czechPositivityChart').first();
    await expect(canvas).toBeVisible();
    
    // Click to show tooltip
    await canvas.click({ position: { x: 150, y: 100 } });
    await page.waitForTimeout(300);
    
    const tooltip = page.locator('#czechPositivityChart-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Close tooltip
    const closeButton = tooltip.locator('.chart-tooltip-close');
    await closeButton.click();
    await page.waitForTimeout(500); // Wait for transition
    
    // Verify it's hidden
    let opacity = await tooltip.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.1); // Allow for small floating point differences
    
    // Click on canvas again to reopen
    await canvas.click({ position: { x: 180, y: 120 } });
    await page.waitForTimeout(300);
    
    // Tooltip should be visible again
    opacity = await tooltip.evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeGreaterThan(0.5);
  });

  test('should work on all chart canvases', async ({ page }) => {
    // Test Czech chart
    let canvas = page.locator('#czechPositivityChart').first();
    await canvas.hover({ position: { x: 200, y: 100 } });
    await page.waitForTimeout(300);
    let tooltip = page.locator('#czechPositivityChart-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Move away to hide tooltip
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    
    // Test EU chart
    canvas = page.locator('#euPositivityChart').first();
    await canvas.hover({ position: { x: 200, y: 100 } });
    await page.waitForTimeout(300);
    tooltip = page.locator('#euPositivityChart-tooltip');
    await expect(tooltip).toBeVisible();
    
    // Move away to hide tooltip
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    
    // Test DE Wastewater chart
    canvas = page.locator('#deWastewaterChart').first();
    await canvas.hover({ position: { x: 200, y: 100 } });
    await page.waitForTimeout(300);
    tooltip = page.locator('#deWastewaterChart-tooltip');
    await expect(tooltip).toBeVisible();
  });
});
