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
      // Pill wrappers use inline-flex; regular buttons are inline-block spans.
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
      'rgb(229, 57, 53)', // negative / rising
      'rgb(67, 160, 71)', // positive / falling
      'rgba(255, 255, 255, 0.55)', // neutral / stable
    ]);
    expect(colors.length).toBeGreaterThan(0);
    for (const color of colors) {
      expect(allowed.has(color)).toBe(true);
    }
  });
});
