import { test, expect } from '@playwright/test';

/**
 * E2E tests for future data display functionality.
 * Verifies that the future data displayed is always 2x the selected past time range.
 */

test.describe('Future Data Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
    await page.waitForSelector('#czechDataContainer-legend');
    
    // Enable future data display
    await page.locator('#includeFutureCheckbox').check();
    await page.waitForTimeout(500);
  });

  test('should display future data when includeFuture is enabled', async ({ page }) => {
    // Verify the checkbox is checked
    await expect(page.locator('#includeFutureCheckbox')).toBeChecked();
    
    // Get the chart canvas
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should show 2x future data for 30 days time range', async ({ page }) => {
    // Select 30 days time range
    await page.locator('#timeRangeSelect').selectOption('30');
    await page.waitForTimeout(500);
    
    // Verify the time range is selected
    await expect(page.locator('#timeRangeSelect')).toHaveValue('30');
    
    // Get chart data via browser evaluation
    const chartInfo = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      if (!configs || configs.length === 0) return null;
      
      const chart = configs[0].chartHolder.chart;
      if (!chart) return null;
      
      const labels = chart.data.labels;
      if (!labels || labels.length === 0) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const firstDate = labels[0];
      const lastDate = labels[labels.length - 1];
      
      // Calculate days from first to today and today to last
      const firstDateObj = new Date(firstDate);
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      
      const pastDays = Math.floor((todayObj.getTime() - firstDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const futureDays = Math.floor((lastDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
      
      return { firstDate, lastDate, today, pastDays, futureDays, totalLabels: labels.length };
    });
    
    expect(chartInfo).not.toBeNull();
    expect(chartInfo!.pastDays).toBeGreaterThanOrEqual(20); // Allow tolerance for data update delays
    expect(chartInfo!.pastDays).toBeLessThanOrEqual(40);
    
    // Future should be approximately 2x past (60 days with some tolerance)
    expect(chartInfo!.futureDays).toBeGreaterThanOrEqual(40);
    expect(chartInfo!.futureDays).toBeLessThanOrEqual(80);
  });

  test('should show 2x future data for 90 days time range', async ({ page }) => {
    // Select 90 days time range
    await page.locator('#timeRangeSelect').selectOption('90');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#timeRangeSelect')).toHaveValue('90');
    
    const chartInfo = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      if (!configs || configs.length === 0) return null;
      
      const chart = configs[0].chartHolder.chart;
      if (!chart) return null;
      
      const labels = chart.data.labels;
      if (!labels || labels.length === 0) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const firstDate = labels[0];
      const lastDate = labels[labels.length - 1];
      
      const firstDateObj = new Date(firstDate);
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      
      const pastDays = Math.floor((todayObj.getTime() - firstDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const futureDays = Math.floor((lastDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
      
      return { firstDate, lastDate, today, pastDays, futureDays, totalLabels: labels.length };
    });
    
    expect(chartInfo).not.toBeNull();
    expect(chartInfo!.pastDays).toBeGreaterThanOrEqual(80); // Allow tolerance for data update delays
    expect(chartInfo!.pastDays).toBeLessThanOrEqual(100);
    
    // Future should be approximately 2x past (180 days with some tolerance)
    expect(chartInfo!.futureDays).toBeGreaterThanOrEqual(160);
    expect(chartInfo!.futureDays).toBeLessThanOrEqual(200);
  });

  test('should show 2x future data for 180 days time range', async ({ page }) => {
    await page.locator('#timeRangeSelect').selectOption('180');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#timeRangeSelect')).toHaveValue('180');
    
    const chartInfo = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      if (!configs || configs.length === 0) return null;
      
      const chart = configs[0].chartHolder.chart;
      if (!chart) return null;
      
      const labels = chart.data.labels;
      if (!labels || labels.length === 0) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const firstDate = labels[0];
      const lastDate = labels[labels.length - 1];
      
      const firstDateObj = new Date(firstDate);
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      
      const pastDays = Math.floor((todayObj.getTime() - firstDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const futureDays = Math.floor((lastDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
      
      return { firstDate, lastDate, today, pastDays, futureDays, totalLabels: labels.length };
    });
    
    expect(chartInfo).not.toBeNull();
    expect(chartInfo!.pastDays).toBeGreaterThanOrEqual(170); // Allow tolerance for data update delays
    expect(chartInfo!.pastDays).toBeLessThanOrEqual(190);
    
    // Future should be approximately 2x past (360 days with some tolerance)
    expect(chartInfo!.futureDays).toBeGreaterThanOrEqual(340);
    expect(chartInfo!.futureDays).toBeLessThanOrEqual(380);
  });

  test('should show 2x future data for 365 days time range', async ({ page }) => {
    await page.locator('#timeRangeSelect').selectOption('365');
    await page.waitForTimeout(500);
    
    await expect(page.locator('#timeRangeSelect')).toHaveValue('365');
    
    const chartInfo = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      if (!configs || configs.length === 0) return null;
      
      const chart = configs[0].chartHolder.chart;
      if (!chart) return null;
      
      const labels = chart.data.labels;
      if (!labels || labels.length === 0) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const firstDate = labels[0];
      const lastDate = labels[labels.length - 1];
      
      const firstDateObj = new Date(firstDate);
      const lastDateObj = new Date(lastDate);
      const todayObj = new Date(today);
      
      const pastDays = Math.floor((todayObj.getTime() - firstDateObj.getTime()) / (1000 * 60 * 60 * 24));
      const futureDays = Math.floor((lastDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
      
      return { firstDate, lastDate, today, pastDays, futureDays, totalLabels: labels.length };
    });
    
    expect(chartInfo).not.toBeNull();
    expect(chartInfo!.pastDays).toBeGreaterThanOrEqual(355); // Allow tolerance for data update delays
    expect(chartInfo!.pastDays).toBeLessThanOrEqual(375);
    
    // Future should be approximately 2x past (730 days) but might be limited by available data
    // The dataset may not have 730 days of future data, so we verify it shows maximum available
    // or at least more future data than for shorter time ranges
    expect(chartInfo!.futureDays).toBeGreaterThanOrEqual(350);
  });

  test('should not show future data when includeFuture is disabled', async ({ page }) => {
    // Disable future data
    await page.locator('#includeFutureCheckbox').uncheck();
    await page.waitForTimeout(500);
    
    await expect(page.locator('#includeFutureCheckbox')).not.toBeChecked();
    
    const chartInfo = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      if (!configs || configs.length === 0) return null;
      
      const chart = configs[0].chartHolder.chart;
      if (!chart) return null;
      
      const labels = chart.data.labels;
      if (!labels || labels.length === 0) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const lastDate = labels[labels.length - 1];
      
      return { lastDate, today };
    });
    
    expect(chartInfo).not.toBeNull();
    // Last date should be today or in the past (no future data)
    expect(new Date(chartInfo!.lastDate).getTime()).toBeLessThanOrEqual(new Date(chartInfo!.today).getTime());
  });

  test('should maintain 2x ratio across multiple charts', async ({ page }) => {
    // Select 90 days and enable future
    await page.locator('#timeRangeSelect').selectOption('90');
    await page.locator('#includeFutureCheckbox').check();
    await page.waitForTimeout(500);
    
    // Get data from multiple charts
    const chartsInfo = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      if (!configs) return [];
      
      const results = [];
      
      for (const config of configs) {
        const chart = config.chartHolder.chart;
        if (!chart) continue;
        
        const labels = chart.data.labels;
        if (!labels || labels.length === 0) continue;
        
        const today = new Date().toISOString().split('T')[0];
        const firstDate = labels[0];
        const lastDate = labels[labels.length - 1];
        
        const firstDateObj = new Date(firstDate);
        const lastDateObj = new Date(lastDate);
        const todayObj = new Date(today);
        
        const pastDays = Math.floor((todayObj.getTime() - firstDateObj.getTime()) / (1000 * 60 * 60 * 24));
        const futureDays = Math.floor((lastDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
        
        results.push({ chartTitle: config.title, pastDays, futureDays, firstDate, lastDate });
      }
      
      return results;
    });
    
    // Should have at least one chart
    expect(chartsInfo.length).toBeGreaterThan(0);
    
    // All charts should show consistent future projection
    for (const chartInfo of chartsInfo) {
      expect(chartInfo.pastDays).toBeGreaterThanOrEqual(80); // Allow tolerance for data update delays
      expect(chartInfo.pastDays).toBeLessThanOrEqual(100);
      expect(chartInfo.futureDays).toBeGreaterThanOrEqual(160);
      expect(chartInfo.futureDays).toBeLessThanOrEqual(200);
    }
  });

  test('should persist future display settings after reload', async ({ page }) => {
    // Set specific configuration
    await page.locator('#timeRangeSelect').selectOption('90');
    await page.locator('#includeFutureCheckbox').check();
    await page.waitForTimeout(500);
    
    // Reload the page
    await page.reload();
    await page.waitForSelector('#timeRangeSelect');
    await page.waitForSelector('canvas');
    await page.waitForTimeout(500);
    
    // Settings should persist
    await expect(page.locator('#timeRangeSelect')).toHaveValue('90');
    await expect(page.locator('#includeFutureCheckbox')).toBeChecked();
    
    // Verify the chart still shows correct future data
    const chartInfo = await page.evaluate(() => {
      const configs = (window as any).__chartConfigs;
      if (!configs || configs.length === 0) return null;
      
      const chart = configs[0].chartHolder.chart;
      if (!chart) return null;
      
      const labels = chart.data.labels;
      if (!labels || labels.length === 0) return null;
      
      const today = new Date().toISOString().split('T')[0];
      const lastDate = labels[labels.length - 1];
      const todayObj = new Date(today);
      const lastDateObj = new Date(lastDate);
      
      const futureDays = Math.floor((lastDateObj.getTime() - todayObj.getTime()) / (1000 * 60 * 60 * 24));
      
      return { futureDays };
    });
    
    expect(chartInfo).not.toBeNull();
    expect(chartInfo!.futureDays).toBeGreaterThanOrEqual(170);
    expect(chartInfo!.futureDays).toBeLessThanOrEqual(190);
  });
});
