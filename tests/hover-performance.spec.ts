import { test, expect } from '@playwright/test';

test('hovering and toggling test-number bars does not keep redrawing the chart', async ({ page }) => {
  await page.addInitScript(() => {
    const originalClearRect = CanvasRenderingContext2D.prototype.clearRect;
    (window as typeof window & { chartClears: number }).chartClears = 0;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.id === 'czechPositivityChart') {
        (window as typeof window & { chartClears: number }).chartClears++;
      }
      return originalClearRect.apply(this, args);
    };
  });

  await page.goto('/');
  const canvas = page.locator('#czechPositivityChart');
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(1200);

  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width - 1, box!.y + box!.height / 2);
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    (window as typeof window & { chartClears: number }).chartClears = 0;
  });

  await page.waitForTimeout(500);
  const redrawsAfterHover = await page.evaluate(
    () => (window as typeof window & { chartClears: number }).chartClears
  );
  expect(redrawsAfterHover).toBe(0);

  const showTestNumbersCheckbox = page.locator('#showTestNumbersCheckbox');
  await showTestNumbersCheckbox.uncheck();
  await showTestNumbersCheckbox.check();
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    (window as typeof window & { chartClears: number }).chartClears = 0;
  });

  await page.waitForTimeout(500);
  const redrawsAfterToggle = await page.evaluate(
    () => (window as typeof window & { chartClears: number }).chartClears
  );
  expect(redrawsAfterToggle).toBe(0);
});
