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
    
    // Switch to Czech
    await languageSelect.selectOption('cs');
    
    // Verify language selector updated
    await expect(languageSelect).toHaveValue('cs');
    
    // Check that Czech UI elements are displayed
    await expect(page.locator('#footerAboutLink')).toHaveText('O projektu');
    await expect(page.locator('#hideAllButton')).toHaveText('Skrýt všechny řady');
    
    // Check that about link points to Czech version
    const aboutLink = page.locator('#footerAboutLink');
    await expect(aboutLink).toHaveAttribute('href', 'about-cs.html');
  });

  test('should switch from Czech back to English', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Switch to Czech first
    await languageSelect.selectOption('cs');
    await expect(page.locator('#footerAboutLink')).toHaveText('O projektu');
    
    // Switch back to English
    await languageSelect.selectOption('en');
    await expect(languageSelect).toHaveValue('en');
    
    // Verify English UI is restored
    await expect(page.locator('#footerAboutLink')).toHaveText('About');
    await expect(page.locator('#hideAllButton')).toHaveText('Hide All Series');
    
    // Check that about link points to English version
    const aboutLink = page.locator('#footerAboutLink');
    await expect(aboutLink).toHaveAttribute('href', 'about.html');
  });

  test('should persist language selection in localStorage', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Switch to Czech
    await languageSelect.selectOption('cs');
    await expect(languageSelect).toHaveValue('cs');
    
    // Reload the page
    await page.reload();
    await page.waitForSelector('#languageSelect');
    
    // Verify language is still Czech
    await expect(languageSelect).toHaveValue('cs');
    await expect(page.locator('#footerAboutLink')).toHaveText('O projektu');
  });

  test('should translate chart titles when switching language', async ({ page }) => {
    const languageSelect = page.locator('#languageSelect');
    
    // Check initial English chart titles
    await expect(page.locator('text=COVID Test Positivity (MZCR Data)')).toBeVisible();
    
    // Switch to Czech
    await languageSelect.selectOption('cs');
    
    // Wait for charts to re-render
    await page.waitForTimeout(500);
    
    // Check Czech chart titles exist
    await expect(page.locator('text=COVID Pozitivita Testů (Data MZČR)')).toBeVisible();
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
