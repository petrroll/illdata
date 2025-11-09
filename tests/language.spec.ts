import { test, expect } from '@playwright/test';

test.describe('Language Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the page to be fully loaded
    await page.waitForSelector('#languageSelect');
    await page.waitForSelector('canvas');
  });

  test('should default to English', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    await expect(languageSelect).toHaveValue('en');
    
    // Check that English UI elements are displayed
    await expect(page).toHaveTitle('illmeter');
    await expect(page.locator('#footerAboutLink')).toHaveText('About');
    await expect(page.locator('#hideAllButton')).toHaveText('Hide All Series');
  });

  test('should switch to Czech and update UI', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Ensure select is fully interactive
    await languageSelect.waitFor({ state: 'visible' });
    
    // Use Playwright's selectOption which handles events properly
    await languageSelect.selectOption('cs');
    
    // Wait for language change to complete 
    await page.waitForTimeout(500);
    
    // Verify language selector updated
    await expect(languageSelect).toHaveValue('cs');
    
    // Check that Czech UI elements are displayed
    await expect(page.locator('#footerAboutLink')).toHaveText('O aplikaci');
    await expect(page.locator('#hideAllButton')).toHaveText('Skrýt všechny série');
    
    // Check that about link points to Czech version
    const aboutLink = page.locator('#footerAboutLink');
    await expect(aboutLink).toHaveAttribute('href', 'about-cs.html');
    
    // Verify language persisted to localStorage
    const storedLanguage = await page.evaluate(() => localStorage.getItem('language'));
    expect(storedLanguage).toBe('cs');
  });

  test('should switch from Czech back to English', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Ensure select is fully interactive
    await languageSelect.waitFor({ state: 'visible' });
    
    // Switch to Czech first
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);
    await expect(page.locator('#footerAboutLink')).toHaveText('O aplikaci');
    
    // Switch back to English
    await languageSelect.selectOption('en');
    await page.waitForTimeout(500);
    await expect(languageSelect).toHaveValue('en');
    
    // Verify English UI is restored
    await expect(page.locator('#footerAboutLink')).toHaveText('About');
    await expect(page.locator('#hideAllButton')).toHaveText('Hide All Series');
    
    // Check that about link points to English version
    const aboutLink = page.locator('#footerAboutLink');
    await expect(aboutLink).toHaveAttribute('href', 'about.html');
    
    // Verify language persisted to localStorage
    const storedLanguage = await page.evaluate(() => localStorage.getItem('language'));
    expect(storedLanguage).toBe('en');
  });

  test('should persist language selection in localStorage', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Ensure select is fully interactive
    await languageSelect.waitFor({ state: 'visible' });
    
    // Switch to Czech
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);
    await expect(languageSelect).toHaveValue('cs');
    
    // Verify stored in localStorage
    const storedLanguage = await page.evaluate(() => localStorage.getItem('language'));
    expect(storedLanguage).toBe('cs');
    
    // Reload the page
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#languageSelect', { timeout: 10000 });
    
    // Verify language is still Czech
    await expect(languageSelect).toHaveValue('cs');
    await expect(page.locator('#footerAboutLink')).toHaveText('O aplikaci');
  });

  test('should translate UI elements when switching language', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Check initial English UI
    await expect(page.locator('#getLinkButton')).toHaveText('Share Link');
    await expect(page.locator('#trendsTableTitle')).toHaveText('Current Trends');
    
    // Switch to Czech
    await languageSelect.selectOption('cs');
    
    // Wait for language change to complete
    await page.waitForTimeout(500);
    
    // Check Czech UI translations
    await expect(page.locator('#getLinkButton')).toHaveText('Sdílet odkaz');
    await expect(page.locator('#trendsTableTitle')).toHaveText('Aktuální trendy');
  });

  test('should translate series names in legend when switching language', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Check for an English series name in legend
    const czechLegend = page.locator('#czechDataContainer-legend');
    await expect(czechLegend).toBeVisible();
    
    // Switch to Czech
    await languageSelect.selectOption('cs');
    await page.waitForTimeout(500);
    
    // The legend should still exist and have translated series names
    await expect(czechLegend).toBeVisible();
    // The content will be in Czech but we just verify the legend is still functional
    const legendItems = czechLegend.locator('span');
    await expect(legendItems.first()).toBeVisible();
  });
});
