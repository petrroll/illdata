import { test, expect } from '@playwright/test';

test('places the Biobot report before the custom graph and opens the full image', async ({ page }) => {
  await page.goto('/');

  const report = page.locator('#biobotRiskReportContainer');
  const image = report.locator('img');
  const imageLink = report.locator('a').first();

  await expect(report).toBeVisible();
  expect(await report.evaluate(element => element.nextElementSibling?.id)).toBe('customGraphContainer');
  await expect(imageLink).toHaveAttribute('href', await image.getAttribute('src') as string);
  await expect(image).toHaveCSS('background-color', 'rgb(18, 18, 18)');
});
