import { test, expect } from '@playwright/test';

/**
 * Tests for the red/green trend indicator dots on legend series pills (issue #174).
 *
 * Each series pill shows a small colored dot reflecting the underlying 28-day trend
 * (red = rising incidence, green = falling, subtle neutral = stable). Split pills
 * (base/shifted and positive/negative tests) get a separate dot in each half.
 */
test.describe('Legend trend indicator dots', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#czechDataContainer-legend');
    // Wait for the legend to be populated with pills.
    await page.waitForFunction(() => {
      const legend = document.getElementById('czechDataContainer-legend');
      return !!legend && legend.querySelectorAll('.trend-dot').length > 0;
    });
  });

  test('renders trend dots inside legend pills', async ({ page }) => {
    const dotCount = await page.locator('#czechDataContainer-legend .trend-dot').count();
    expect(dotCount).toBeGreaterThan(0);
  });

  test('split base/shifted pills each get their own dot', async ({ page }) => {
    // A split shifted pill wrapper contains two buttons; when a trend is known,
    // each half carries a dot, so a pill can hold up to two dots.
    const perPillDotCounts = await page.evaluate(() => {
      const legend = document.getElementById('czechDataContainer-legend');
      if (!legend) return [];
      // Pill parts and wrappers use inline-flex spans; a split pill wrapper nests two
      // buttons, so its dot count reflects both halves.
      const wrappers = Array.from(legend.querySelectorAll('span')).filter(
        (el) => (el as HTMLElement).style.display === 'inline-flex'
      );
      return wrappers.map((w) => w.querySelectorAll('.trend-dot').length);
    });

    // There is at least one split pill, and at least one of them shows two dots
    // (one per half), confirming separate indicators for base and shifted parts.
    expect(perPillDotCounts.length).toBeGreaterThan(0);
    expect(Math.max(...perPillDotCounts)).toBe(2);
  });

  test('trend dot colors reflect rising/falling/stable trends', async ({ page }) => {
    const colors = await page.evaluate(() => {
      const dots = Array.from(document.querySelectorAll('.trend-dot')) as HTMLElement[];
      return dots.map((d) => d.style.backgroundColor);
    });

    // Every rendered dot must use one of the three known indicator colors.
    const allowed = new Set([
      'rgb(215, 90, 86)', // negative / rising
      'rgb(90, 162, 94)', // positive / falling
      'rgb(154, 160, 166)', // neutral / stable
    ]);
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) {
      expect(allowed.has(color)).toBe(true);
    }
  });
});
