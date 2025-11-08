// About page localization handler
import { getLanguage, setLanguage, getTranslations, type Language } from "./locales";

// Initialize language system
let currentLanguage = getLanguage();
let translations = getTranslations(currentLanguage);

// Set up language switcher
const languageSelect = document.getElementById("languageSelect") as HTMLSelectElement;
if (languageSelect) {
    languageSelect.value = currentLanguage;
    languageSelect.addEventListener('change', () => {
        const newLang = languageSelect.value as Language;
        setLanguage(newLang);
        currentLanguage = newLang;
        translations = getTranslations(newLang);
        
        // Update all content
        renderContent();
    });
}

function renderContent() {
    const t = translations;
    
    // Update page title
    const pageTitle = document.getElementById("pageTitle");
    if (pageTitle) pageTitle.textContent = t.aboutPageTitle;
    
    // Update footer
    const footerBackLink = document.getElementById("footerBackLink");
    if (footerBackLink) footerBackLink.textContent = t.aboutBackToDashboard;
    
    const footerGithubLink = document.getElementById("footerGithubLink");
    if (footerGithubLink) footerGithubLink.textContent = t.footerGithub;
    
    // Build the main content
    const content = document.getElementById("content");
    if (!content) return;
    
    content.innerHTML = `
      <a href="index.html" class="back-link">${t.aboutBackToDashboard}</a>
      
      <h1>${t.aboutTitle}</h1>
      
      <p>${t.aboutIntro}</p>

      <h2>${t.aboutDataSources}</h2>
      
      <p>${t.aboutDataSourcesIntro}</p>

      <div class="data-source">
        <h3>${t.aboutCzechCovidTitle}</h3>
        <p><strong>Source:</strong> ${t.aboutCzechCovidSource}</p>
        <p><strong>Data Type:</strong> ${t.aboutCzechCovidType}</p>
        <p><strong>Frequency:</strong> ${t.aboutCzechCovidFrequency}</p>
        <p><strong>Link:</strong> <a href="https://onemocneni-aktualne.mzcr.cz/api/v2/covid-19" target="_blank">${t.aboutCzechCovidLink}</a></p>
        <p><strong>What it shows:</strong> ${t.aboutCzechCovidDescription}</p>
      </div>

      <div class="data-source">
        <h3>${t.aboutEuEcdcTitle}</h3>
        <p><strong>Source:</strong> ${t.aboutEuEcdcSource}</p>
        <p><strong>Data Type:</strong> ${t.aboutEuEcdcType}</p>
        <p><strong>Frequency:</strong> ${t.aboutEuEcdcFrequency}</p>
        <p><strong>Link:</strong> <a href="https://github.com/EU-ECDC/Respiratory_viruses_weekly_data" target="_blank">${t.aboutEuEcdcLink}</a></p>
        <p><strong>What it shows:</strong> ${t.aboutEuEcdcDescription}</p>
        <p><strong>Note on Sentinel Data:</strong> ${t.aboutEuEcdcSentinelNote}</p>
      </div>

      <div class="data-source">
        <h3>${t.aboutDeWastewaterTitle}</h3>
        <p><strong>Source:</strong> ${t.aboutDeWastewaterSource}</p>
        <p><strong>Data Type:</strong> ${t.aboutDeWastewaterType}</p>
        <p><strong>Frequency:</strong> ${t.aboutDeWastewaterFrequency}</p>
        <p><strong>Link:</strong> <a href="https://github.com/robert-koch-institut/Abwassersurveillance_AMELAG" target="_blank">${t.aboutDeWastewaterLink}</a></p>
        <p><strong>What it shows:</strong> ${t.aboutDeWastewaterDescription}</p>
      </div>

      <h2>${t.aboutUnderstandingDataTitle}</h2>

      <p>${t.aboutUnderstandingDataIntro}</p>

      <div class="series-type">
        <p><strong>${t.aboutRawSeries}</strong> ${t.aboutRawSeriesDescription}</p>
      </div>

      <div class="series-type">
        <p><strong>${t.aboutAveragedSeries}</strong> ${t.aboutAveragedSeriesDescription}</p>
      </div>

      <div class="series-type">
        <p><strong>${t.aboutShiftedSeries}</strong> ${t.aboutShiftedSeriesDescription}</p>
      </div>

      <div class="series-type">
        <p><strong>${t.aboutTestNumbers}</strong> ${t.aboutTestNumbersDescription}</p>
      </div>

      <div class="series-type">
        <p><strong>${t.aboutMinMaxSeries}</strong> ${t.aboutMinMaxSeriesDescription}</p>
      </div>

      <h2>${t.aboutKeyDifferencesTitle}</h2>

      <h3>${t.aboutPositivityVsWastewaterTitle}</h3>
      <p>${t.aboutPositivityVsWastewaterDescription}</p>

      <h3>${t.aboutCountrySpecificTitle}</h3>
      <p>${t.aboutCountrySpecificDescription}</p>

      <h2>${t.aboutHowToUseTitle}</h2>

      <h3>${t.aboutBasicControlsTitle}</h3>
      <ul>
        ${t.aboutBasicControlsItems.map(item => `<li>${item}</li>`).join('')}
      </ul>

      <h3>${t.aboutSeriesVisibilityTitle}</h3>
      <ul>
        ${t.aboutSeriesVisibilityItems.map(item => `<li>${item}</li>`).join('')}
      </ul>

      <h3>${t.aboutAdvancedFeaturesTitle}</h3>
      <ul>
        ${t.aboutAdvancedFeaturesItems.map(item => `<li>${item}</li>`).join('')}
      </ul>

      <h3>${t.aboutReadingChartsTitle}</h3>
      <ul>
        ${t.aboutReadingChartsItems.map(item => `<li>${item}</li>`).join('')}
      </ul>

      <h2>${t.aboutTipsTitle}</h2>
      <ul>
        ${t.aboutTipsItems.map(item => `<li>${item}</li>`).join('')}
      </ul>

      <h2>${t.aboutTechnicalTitle}</h2>
      <ul>
        ${t.aboutTechnicalItems.map(item => `<li>${item}</li>`).join('')}
      </ul>

      <h2>${t.aboutSourceCodeTitle}</h2>
      <p>
        ${t.aboutSourceCodeDescription}
      </p>

      <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #666; font-size: 0.9em;">
        <strong>${t.aboutDisclaimerTitle}</strong> ${t.aboutDisclaimerText}
      </p>
    `;
}

// Initial render
renderContent();
