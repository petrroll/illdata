// Localization system for illmeter
// Supports English and Czech languages

export type Language = 'en' | 'cs';

export interface Translations {
    // Page titles
    pageTitle: string;
    aboutPageTitle: string;
    
    // Footer
    footerAbout: string;
    footerGithub: string;
    footerGetLink: string;
    footerLastUpdate: string;
    
    // Main controls
    timeRangeLastMonth: string;
    timeRangeLast90Days: string;
    timeRangeLast180Days: string;
    timeRangeLastYear: string;
    timeRangeLast2Years: string;
    timeRangeAllTime: string;
    includeFutureData: string;
    showMinMaxSeries: string;
    showShiftedSeries: string;
    showTestNumbers: string;
    showShiftedTestNumbers: string;
    shiftBy: string;
    shiftByDays: string;
    shiftByMaxima: string;
    shiftByMinima: string;
    hideAllButton: string;
    
    // Charts
    chartTitleCzechCovid: string;
    chartTitleEuViruses: string;
    chartTitleDeWastewater: string;
    countryLabel: string;
    
    // Trends table
    trendsTableTitle: string;
    trendsTablePeriodLabel: string;
    trendsPeriod7d: string;
    trendsPeriod7dSub: string;
    trendsPeriod28d: string;
    trendsPeriod28dSub: string;
    trendsNoDataAvailable: string;
    
    // About page
    aboutBackToDashboard: string;
    aboutTitle: string;
    aboutIntro: string;
    aboutDataSources: string;
    aboutDataSourcesIntro: string;
    aboutCzechCovidTitle: string;
    aboutCzechCovidSource: string;
    aboutCzechCovidType: string;
    aboutCzechCovidFrequency: string;
    aboutCzechCovidLink: string;
    aboutCzechCovidDescription: string;
    aboutEuEcdcTitle: string;
    aboutEuEcdcSource: string;
    aboutEuEcdcType: string;
    aboutEuEcdcFrequency: string;
    aboutEuEcdcLink: string;
    aboutEuEcdcDescription: string;
    aboutEuEcdcSentinelNote: string;
    aboutDeWastewaterTitle: string;
    aboutDeWastewaterSource: string;
    aboutDeWastewaterType: string;
    aboutDeWastewaterFrequency: string;
    aboutDeWastewaterLink: string;
    aboutDeWastewaterDescription: string;
    aboutUnderstandingDataTitle: string;
    aboutUnderstandingDataIntro: string;
    aboutRawSeries: string;
    aboutRawSeriesDescription: string;
    aboutAveragedSeries: string;
    aboutAveragedSeriesDescription: string;
    aboutShiftedSeries: string;
    aboutShiftedSeriesDescription: string;
    aboutTestNumbers: string;
    aboutTestNumbersDescription: string;
    aboutMinMaxSeries: string;
    aboutMinMaxSeriesDescription: string;
    aboutKeyDifferencesTitle: string;
    aboutPositivityVsWastewaterTitle: string;
    aboutPositivityVsWastewaterDescription: string;
    aboutCountrySpecificTitle: string;
    aboutCountrySpecificDescription: string;
    aboutHowToUseTitle: string;
    aboutBasicControlsTitle: string;
    aboutBasicControlsItems: string[];
    aboutSeriesVisibilityTitle: string;
    aboutSeriesVisibilityItems: string[];
    aboutAdvancedFeaturesTitle: string;
    aboutAdvancedFeaturesItems: string[];
    aboutReadingChartsTitle: string;
    aboutReadingChartsItems: string[];
    aboutTipsTitle: string;
    aboutTipsItems: string[];
    aboutTechnicalTitle: string;
    aboutTechnicalItems: string[];
    aboutSourceCodeTitle: string;
    aboutSourceCodeDescription: string;
    aboutDisclaimerTitle: string;
    aboutDisclaimerText: string;
    
    // Series name components (for translation)
    seriesPositivity: string;
    seriesPcr: string;
    seriesAntigen: string;
    seriesInfluenza: string;
    seriesRsv: string;
    seriesSarsCov2: string;
    seriesWastewater: string;
    seriesAvgSuffix: string;  // e.g., "28d avg"
    seriesShiftedBy: string;  // "shifted by"
    seriesWave: string;  // "wave"
    seriesWaves: string;  // "waves"
    seriesDays: string;  // "days"
    seriesPositiveTests: string;  // "Positive Tests"
    seriesNegativeTests: string;  // "Negative Tests"
}

// Series name translation mapping
interface SeriesNameMap {
    [key: string]: {
        en: string;
        cs: string;
    };
}

const seriesNameMap: SeriesNameMap = {
    'PCR Positivity': {
        en: 'PCR Positivity',
        cs: 'PCR pozitivita'
    },
    'Antigen Positivity': {
        en: 'Antigen Positivity',
        cs: 'Antigenní pozitivita'
    },
    'Influenza Positivity': {
        en: 'Influenza Positivity',
        cs: 'Chřipka pozitivita'
    },
    'RSV Positivity': {
        en: 'RSV Positivity',
        cs: 'RSV pozitivita'
    },
    'SARS-CoV-2 Positivity': {
        en: 'SARS-CoV-2 Positivity',
        cs: 'SARS-CoV-2 pozitivita'
    },
    'Influenza Wastewater': {
        en: 'Influenza Wastewater',
        cs: 'Chřipka odpadní vody'
    },
    'RSV Wastewater': {
        en: 'RSV Wastewater',
        cs: 'RSV odpadní vody'
    },
    'SARS-CoV-2 Wastewater': {
        en: 'SARS-CoV-2 Wastewater',
        cs: 'SARS-CoV-2 odpadní vody'
    }
};

const en: Translations = {
    // Page titles
    pageTitle: 'illmeter',
    aboutPageTitle: 'About - illmeter',
    
    // Footer
    footerAbout: 'About',
    footerGithub: 'View on GitHub',
    footerGetLink: 'Share Link',
    footerLastUpdate: 'Last data update:',
    
    // Main controls
    timeRangeLastMonth: 'Last Month',
    timeRangeLast90Days: 'Last 90 Days',
    timeRangeLast180Days: 'Last 180 Days',
    timeRangeLastYear: 'Last Year',
    timeRangeLast2Years: 'Last 2 Years',
    timeRangeAllTime: 'All Time',
    includeFutureData: 'Include Future Data',
    showMinMaxSeries: 'Show Min/Max Series',
    showShiftedSeries: 'Show Shifted Series',
    showTestNumbers: 'Show Test Numbers',
    showShiftedTestNumbers: 'Show Shifted Test Numbers',
    shiftBy: 'Shift By:',
    shiftByDays: 'Days',
    shiftByMaxima: 'Maxima',
    shiftByMinima: 'Minima',
    hideAllButton: 'Hide All Series',
    
    // Charts
    chartTitleCzechCovid: 'COVID Test Positivity (MZCR Data)',
    chartTitleEuViruses: 'EU ECDC Respiratory Viruses',
    chartTitleDeWastewater: 'Germany Wastewater Surveillance (AMELAG)',
    countryLabel: 'Country:',
    
    // Trends table
    trendsTableTitle: 'Current Trends',
    trendsTablePeriodLabel: 'Trend Period',
    trendsPeriod7d: '7d trend',
    trendsPeriod7dSub: '(vs prior)',
    trendsPeriod28d: '28d trend',
    trendsPeriod28dSub: '(vs prior)',
    trendsNoDataAvailable: 'No main series visible',
    
    // About page
    aboutBackToDashboard: '← Back to Dashboard',
    aboutTitle: 'About illmeter',
    aboutIntro: 'illmeter is a data visualization dashboard that explores illness positivity rates across Europe—with a primary focus on Czechia. It provides a single pane of glass for monitoring COVID-19 and respiratory virus trends through test positivity rates and wastewater surveillance data.',
    aboutDataSources: 'Data Sources',
    aboutDataSourcesIntro: 'This dashboard aggregates data from multiple authoritative sources:',
    aboutCzechCovidTitle: 'Czech COVID Data (MZCR)',
    aboutCzechCovidSource: 'Ministry of Health of the Czech Republic (Ministerstvo zdravotnictví České republiky)',
    aboutCzechCovidType: 'COVID-19 test positivity (PCR and Antigen tests)',
    aboutCzechCovidFrequency: 'Daily',
    aboutCzechCovidLink: 'MZCR COVID-19 API',
    aboutCzechCovidDescription: 'Daily PCR and Antigen test results for COVID-19 in Czechia, including total tests performed and positive results.',
    aboutEuEcdcTitle: 'EU ECDC Respiratory Viruses (ERV-IS)',
    aboutEuEcdcSource: 'European Centre for Disease Prevention and Control',
    aboutEuEcdcType: 'Sentinel surveillance data for multiple respiratory viruses (COVID-19, Influenza, RSV)',
    aboutEuEcdcFrequency: 'Weekly',
    aboutEuEcdcLink: 'ECDC Respiratory Viruses Weekly Data',
    aboutEuEcdcDescription: 'Aggregated positivity rates across EU/EEA countries and individual country data for various respiratory pathogens.',
    aboutEuEcdcSentinelNote: 'Sentinel surveillance uses a network of selected healthcare providers (like specific clinics and laboratories) to systematically monitor disease trends. Unlike comprehensive testing of all cases, sentinel sites report data from a representative sample of the population, providing early warning signals and trend indicators for respiratory illness activity across regions.',
    aboutDeWastewaterTitle: 'Germany Wastewater Surveillance (AMELAG)',
    aboutDeWastewaterSource: 'Robert Koch Institute',
    aboutDeWastewaterType: 'SARS-CoV-2 viral load in wastewater',
    aboutDeWastewaterFrequency: 'Daily',
    aboutDeWastewaterLink: 'RKI Abwassersurveillance AMELAG',
    aboutDeWastewaterDescription: 'Normalized virus load measurements from wastewater samples across Germany, providing an early warning indicator for COVID-19 trends.',
    aboutUnderstandingDataTitle: 'Understanding the Data Series',
    aboutUnderstandingDataIntro: 'The dashboard presents data in several different formats to help you understand trends:',
    aboutRawSeries: 'Raw Series:',
    aboutRawSeriesDescription: 'Direct data from the source without any processing. Shows the actual day-to-day values as reported. These can be noisy and show high variability.',
    aboutAveragedSeries: 'Averaged Series (e.g., "28d avg"):',
    aboutAveragedSeriesDescription: 'Moving average calculated over a specified window (typically 28 days). This smooths out daily fluctuations and makes it easier to see overall trends.',
    aboutShiftedSeries: 'Shifted Series:',
    aboutShiftedSeriesDescription: 'Time-shifted versions of data series that allow you to compare current trends with past waves. The shift can be: By Days (manual shift by a specified number of days backward or forward) or By Maxima/Minima (automatic alignment based on wave peaks or troughs to compare waves directly).',
    aboutTestNumbers: 'Test Numbers:',
    aboutTestNumbersDescription: 'Bar charts showing the actual number of tests performed (split into positive and negative). Available for raw positivity data to provide context for positivity rates.',
    aboutMinMaxSeries: 'Min/Max Series:',
    aboutMinMaxSeriesDescription: 'Points marking local minima and maxima in the data, useful for identifying wave peaks and troughs.',
    aboutKeyDifferencesTitle: 'Key Differences Between Data Types',
    aboutPositivityVsWastewaterTitle: 'Positivity Data vs Wastewater Data',
    aboutPositivityVsWastewaterDescription: 'Positivity Data: Shows the percentage of tests that are positive. Depends on testing behavior and policies. Values are shown as percentages. Wastewater Data: Measures viral RNA in sewage. Independent of testing behavior, provides population-level surveillance. Values are shown as normalized viral load (scientific notation).',
    aboutCountrySpecificTitle: 'Country-Specific vs Aggregate Data',
    aboutCountrySpecificDescription: 'Czech MZCR: Specific to Czech Republic only. EU ECDC: Offers both EU/EEA aggregate data and individual country data (use the country selector). Germany Wastewater: Specific to Germany only.',
    aboutHowToUseTitle: 'How to Use the Dashboard',
    aboutBasicControlsTitle: 'Basic Controls',
    aboutBasicControlsItems: [
        'Time Range Selector: Choose how far back to display data (30 days to all time)',
        'Include Future Data: Show or hide projected/future data points (shown in gray)',
        'Country Selector (EU data): Filter EU data by specific country or view aggregate EU/EEA data'
    ],
    aboutSeriesVisibilityTitle: 'Series Visibility',
    aboutSeriesVisibilityItems: [
        'Legend Items: Click on any colored series name below a chart to show/hide that series',
        'Hide All Series Button: Quickly hide all series across all charts to start fresh',
        'Show Shifted Series: Toggle visibility of time-shifted comparison series',
        'Show Test Numbers: Toggle bar charts showing test volumes',
        'Show Min/Max Series: Toggle markers for wave peaks and troughs'
    ],
    aboutAdvancedFeaturesTitle: 'Advanced Features',
    aboutAdvancedFeaturesItems: [
        'Shift By Controls: Select "Days" to manually shift by a specific number of days. Select "Maxima" or "Minima" to automatically align waves based on peaks or troughs. The number input specifies either days to shift or which wave to compare (1 = most recent wave, 2 = second wave back, etc.)',
        'Current Trends Table: Shows 7-day and 28-day trend ratios (current period vs. previous period) for visible series',
        'Interactive Tooltips: Hover over any chart to see detailed values for that date across all visible series'
    ],
    aboutReadingChartsTitle: 'Reading the Charts',
    aboutReadingChartsItems: [
        'Left Y-Axis: Positivity percentage or virus load (depending on data type)',
        'Right Y-Axis: Number of tests (when test bars are visible)',
        'X-Axis: Date (future dates shown in gray)',
        'Solid Lines: Original time series',
        'Dashed Lines: Time-shifted comparison series'
    ],
    aboutTipsTitle: 'Tips for Analysis',
    aboutTipsItems: [
        'Use averaged series (28d) for identifying overall trends without daily noise',
        'Compare shifted series with current data to see if patterns are repeating',
        'Watch wastewater data as an early indicator—it often leads test positivity by several days',
        'Check test numbers alongside positivity to understand if changes are due to testing volume',
        'Use the trend table for quick assessment of whether metrics are rising or falling'
    ],
    aboutTechnicalTitle: 'Technical Details',
    aboutTechnicalItems: [
        'Data Processing: Raw data is fetched from sources and processed daily',
        'Moving Averages: Centered moving averages to smooth trends',
        'Local Storage: Your preferences (series visibility, time range, etc.) are saved in your browser',
        'Updates: Data is refreshed during builds; check the footer for last update time'
    ],
    aboutSourceCodeTitle: 'Source Code',
    aboutSourceCodeDescription: 'illmeter is open source and available on GitHub. Contributions and feedback are welcome!',
    aboutDisclaimerTitle: 'Disclaimer:',
    aboutDisclaimerText: 'This dashboard is provided for informational purposes only. The data is sourced from official public health repositories. Always refer to official health authorities for public health guidance and decisions.',
    
    // Series name components
    seriesPositivity: 'Positivity',
    seriesPcr: 'PCR',
    seriesAntigen: 'Antigen',
    seriesInfluenza: 'Influenza',
    seriesRsv: 'RSV',
    seriesSarsCov2: 'SARS-CoV-2',
    seriesWastewater: 'Wastewater',
    seriesAvgSuffix: 'd avg',
    seriesShiftedBy: 'shifted by',
    seriesWave: 'wave',
    seriesWaves: 'waves',
    seriesDays: 'days',
    seriesPositiveTests: 'Positive Tests',
    seriesNegativeTests: 'Negative Tests'
};

const cs: Translations = {
    // Page titles
    pageTitle: 'illmeter',
    aboutPageTitle: 'O aplikaci - illmeter',
    
    // Footer
    footerAbout: 'O aplikaci',
    footerGithub: 'Zobrazit na GitHubu',
    footerGetLink: 'Sdílet odkaz',
    footerLastUpdate: 'Poslední aktualizace dat:',
    
    // Main controls
    timeRangeLastMonth: 'Poslední měsíc',
    timeRangeLast90Days: 'Posledních 90 dní',
    timeRangeLast180Days: 'Posledních 180 dní',
    timeRangeLastYear: 'Poslední rok',
    timeRangeLast2Years: 'Poslední 2 roky',
    timeRangeAllTime: 'Celá historie',
    includeFutureData: 'Zahrnout budoucí data',
    showMinMaxSeries: 'Zobrazit Min/Max série',
    showShiftedSeries: 'Zobrazit posunuté série',
    showTestNumbers: 'Zobrazit počty testů',
    showShiftedTestNumbers: 'Zobrazit posunuté počty testů',
    shiftBy: 'Posun o:',
    shiftByDays: 'Dny',
    shiftByMaxima: 'Maxima',
    shiftByMinima: 'Minima',
    hideAllButton: 'Skrýt všechny série',
    
    // Charts
    chartTitleCzechCovid: 'Pozitivita testů COVID (data MZČR)',
    chartTitleEuViruses: 'Respirační viry EU ECDC',
    chartTitleDeWastewater: 'Sledování odpadních vod v Německu (AMELAG)',
    countryLabel: 'Země:',
    
    // Trends table
    trendsTableTitle: 'Aktuální trendy',
    trendsTablePeriodLabel: 'Období trendu',
    trendsPeriod7d: '7denní trend',
    trendsPeriod7dSub: '(vs. předchozí)',
    trendsPeriod28d: '28denní trend',
    trendsPeriod28dSub: '(vs. předchozí)',
    trendsNoDataAvailable: 'Žádné hlavní série nejsou viditelné',
    
    // About page
    aboutBackToDashboard: '← Zpět na dashboard',
    aboutTitle: 'O aplikaci illmeter',
    aboutIntro: 'illmeter je dashboard pro vizualizaci dat, který zkoumá míru pozitivity nemocí napříč Evropou—s primárním zaměřením na Česko. Poskytuje jednotné místo pro sledování trendů COVID-19 a respiračních virů prostřednictvím pozitivity testů a sledování odpadních vod.',
    aboutDataSources: 'Zdroje dat',
    aboutDataSourcesIntro: 'Tento dashboard agreguje data z více autoritativních zdrojů:',
    aboutCzechCovidTitle: 'Česká data COVID (MZČR)',
    aboutCzechCovidSource: 'Ministerstvo zdravotnictví České republiky',
    aboutCzechCovidType: 'Pozitivita testů COVID-19 (PCR a antigenní testy)',
    aboutCzechCovidFrequency: 'Denně',
    aboutCzechCovidLink: 'MZČR COVID-19 API',
    aboutCzechCovidDescription: 'Denní výsledky PCR a antigenních testů na COVID-19 v Česku, včetně celkového počtu provedených testů a pozitivních výsledků.',
    aboutEuEcdcTitle: 'Respirační viry EU ECDC (ERV-IS)',
    aboutEuEcdcSource: 'Evropské centrum pro prevenci a kontrolu nemocí',
    aboutEuEcdcType: 'Data ze sentinelového sledování pro více respiračních virů (COVID-19, chřipka, RSV)',
    aboutEuEcdcFrequency: 'Týdně',
    aboutEuEcdcLink: 'ECDC týdenní data o respiračních virech',
    aboutEuEcdcDescription: 'Agregované míry pozitivity napříč zeměmi EU/EEA a individuální data zemí pro různé respirační patogeny.',
    aboutEuEcdcSentinelNote: 'Sentinelové sledování využívá síť vybraných poskytovatelů zdravotní péče (jako jsou konkrétní kliniky a laboratoře) k systematickému monitorování trendů nemocí. Na rozdíl od komplexního testování všech případů, sentinelová místa hlásí data z reprezentativního vzorku populace, poskytující včasná varování a trendové indikátory pro aktivitu respiračních nemocí napříč regiony.',
    aboutDeWastewaterTitle: 'Sledování odpadních vod v Německu (AMELAG)',
    aboutDeWastewaterSource: 'Institut Roberta Kocha',
    aboutDeWastewaterType: 'Virová nálož SARS-CoV-2 v odpadních vodách',
    aboutDeWastewaterFrequency: 'Denně',
    aboutDeWastewaterLink: 'RKI Abwassersurveillance AMELAG',
    aboutDeWastewaterDescription: 'Normalizovaná měření virové nálože ze vzorků odpadních vod napříč Německem, poskytující včasný varovný indikátor pro trendy COVID-19.',
    aboutUnderstandingDataTitle: 'Porozumění datovým sériím',
    aboutUnderstandingDataIntro: 'Dashboard prezentuje data v několika různých formátech, které vám pomohou porozumět trendům:',
    aboutRawSeries: 'Surové série:',
    aboutRawSeriesDescription: 'Přímá data ze zdroje bez jakéhokoli zpracování. Zobrazují skutečné denní hodnoty, jak byly hlášeny. Mohou být zašuměné a vykazovat vysokou variabilitu.',
    aboutAveragedSeries: 'Zprůměrované série (např. "28d prům."):',
    aboutAveragedSeriesDescription: 'Klouzavý průměr vypočítaný přes specifikované okno (typicky 28 dní). To vyhlazuje denní fluktuace a usnadňuje vidět celkové trendy.',
    aboutShiftedSeries: 'Posunuté série:',
    aboutShiftedSeriesDescription: 'Časově posunuté verze datových sérií, které umožňují porovnat aktuální trendy s minulými vlnami. Posun může být: Po dnech (manuální posun o specifikovaný počet dní zpět nebo vpřed) nebo Po maximech/minimech (automatické zarovnání založené na vrcholech vln nebo propadech pro přímé porovnání vln).',
    aboutTestNumbers: 'Počty testů:',
    aboutTestNumbersDescription: 'Sloupcové grafy zobrazující skutečný počet provedených testů (rozdělené na pozitivní a negativní). Dostupné pro surová data o pozitivitě pro poskytnutí kontextu k mírám pozitivity.',
    aboutMinMaxSeries: 'Série Min/Max:',
    aboutMinMaxSeriesDescription: 'Body označující lokální minima a maxima v datech, užitečné pro identifikaci vrcholů a propadů vln.',
    aboutKeyDifferencesTitle: 'Klíčové rozdíly mezi typy dat',
    aboutPositivityVsWastewaterTitle: 'Data o pozitivitě vs. data z odpadních vod',
    aboutPositivityVsWastewaterDescription: 'Data o pozitivitě: Zobrazují procento testů, které jsou pozitivní. Závisí na testovacím chování a politikách. Hodnoty jsou zobrazeny jako procenta. Data z odpadních vod: Měří virovou RNA v odpadních vodách. Nezávislé na testovacím chování, poskytuje populační úroveň sledování. Hodnoty jsou zobrazeny jako normalizovaná virová nálož (vědecká notace).',
    aboutCountrySpecificTitle: 'Země-specifická vs. agregovaná data',
    aboutCountrySpecificDescription: 'Česká MZČR: Specifické pouze pro Českou republiku. EU ECDC: Nabízí jak agregovaná data EU/EEA, tak individuální data zemí (použijte výběr země). Německé odpadní vody: Specifické pouze pro Německo.',
    aboutHowToUseTitle: 'Jak používat dashboard',
    aboutBasicControlsTitle: 'Základní ovládací prvky',
    aboutBasicControlsItems: [
        'Výběr časového rozsahu: Vyberte, jak daleko zpět zobrazit data (30 dní až celá historie)',
        'Zahrnout budoucí data: Zobrazit nebo skrýt projektovaná/budoucí datové body (zobrazené šedě)',
        'Výběr země (data EU): Filtrujte data EU podle konkrétní země nebo zobrazte agregovaná data EU/EEA'
    ],
    aboutSeriesVisibilityTitle: 'Viditelnost sérií',
    aboutSeriesVisibilityItems: [
        'Položky legendy: Klikněte na jakýkoli barevný název série pod grafem pro zobrazení/skrytí této série',
        'Tlačítko Skrýt všechny série: Rychle skryjte všechny série napříč všemi grafy a začněte znovu',
        'Zobrazit posunuté série: Přepínat viditelnost časově posunutých srovnávacích sérií',
        'Zobrazit počty testů: Přepínat sloupcové grafy zobrazující objemy testů',
        'Zobrazit série Min/Max: Přepínat značky pro vrcholy vln a propady'
    ],
    aboutAdvancedFeaturesTitle: 'Pokročilé funkce',
    aboutAdvancedFeaturesItems: [
        'Ovládací prvky posunu: Vyberte "Dny" pro manuální posun o konkrétní počet dní. Vyberte "Maxima" nebo "Minima" pro automatické zarovnání vln na základě vrcholů nebo propadů. Číselný vstup specifikuje buď dny k posunu, nebo kterou vlnu porovnat (1 = nejnovější vlna, 2 = druhá vlna zpět, atd.)',
        'Tabulka aktuálních trendů: Zobrazuje 7denní a 28denní trendové poměry (aktuální období vs. předchozí období) pro viditelné série',
        'Interaktivní nápovědy: Najeďte myší na jakýkoli graf pro zobrazení podrobných hodnot pro toto datum napříč všemi viditelnými sériemi'
    ],
    aboutReadingChartsTitle: 'Čtení grafů',
    aboutReadingChartsItems: [
        'Levá osa Y: Procento pozitivity nebo virová nálož (v závislosti na typu dat)',
        'Pravá osa Y: Počet testů (když jsou viditelné sloupcové testy)',
        'Osa X: Datum (budoucí data zobrazena šedě)',
        'Plné čáry: Původní časové série',
        'Čárkované čáry: Časově posunuté srovnávací série'
    ],
    aboutTipsTitle: 'Tipy pro analýzu',
    aboutTipsItems: [
        'Používejte zprůměrované série (28d) pro identifikaci celkových trendů bez denního šumu',
        'Porovnejte posunuté série s aktuálními daty, abyste viděli, zda se vzorce opakují',
        'Sledujte data z odpadních vod jako včasný indikátor—často předchází pozitivitě testů o několik dní',
        'Kontrolujte počty testů spolu s pozitivitou, abyste pochopili, zda změny jsou způsobeny objemem testování',
        'Používejte tabulku trendů pro rychlé posouzení, zda metriky stoupají nebo klesají'
    ],
    aboutTechnicalTitle: 'Technické detaily',
    aboutTechnicalItems: [
        'Zpracování dat: Surová data jsou získávána ze zdrojů a zpracovávána denně',
        'Klouzavé průměry: Centrované klouzavé průměry pro vyhlazení trendů',
        'Lokální úložiště: Vaše preference (viditelnost sérií, časový rozsah, atd.) jsou uloženy ve vašem prohlížeči',
        'Aktualizace: Data jsou aktualizována během buildů; zkontrolujte čas poslední aktualizace v patičce'
    ],
    aboutSourceCodeTitle: 'Zdrojový kód',
    aboutSourceCodeDescription: 'illmeter je open source a dostupný na GitHubu. Příspěvky a zpětná vazba jsou vítány!',
    aboutDisclaimerTitle: 'Upozornění:',
    aboutDisclaimerText: 'Tento dashboard je poskytován pouze pro informační účely. Data pocházejí z oficiálních veřejných zdravotních úložišť. Vždy se obracejte na oficiální zdravotnické orgány pro pokyny a rozhodnutí týkající se veřejného zdraví.',
    
    // Series name components
    seriesPositivity: 'pozitivita',
    seriesPcr: 'PCR',
    seriesAntigen: 'antigenní',
    seriesInfluenza: 'chřipka',
    seriesRsv: 'RSV',
    seriesSarsCov2: 'SARS-CoV-2',
    seriesWastewater: 'odpadní vody',
    seriesAvgSuffix: 'd prům.',
    seriesShiftedBy: 'posunuto o',
    seriesWave: 'vlna',
    seriesWaves: 'vlny',
    seriesDays: 'dnů',
    seriesPositiveTests: 'pozitivní testy',
    seriesNegativeTests: 'negativní testy'
};

// Language management
const LANGUAGE_KEY = 'illmeter-language';  // Changed to match about pages

export function getLanguage(): Language {
    try {
        const stored = localStorage.getItem(LANGUAGE_KEY);
        if (stored === 'en' || stored === 'cs') {
            return stored;
        }
    } catch (error) {
        console.error('Error loading language:', error);
    }
    return 'en'; // Default to English
}

export function setLanguage(lang: Language): void {
    try {
        localStorage.setItem(LANGUAGE_KEY, lang);
    } catch (error) {
        console.error('Error saving language:', error);
    }
}

export function getTranslations(lang?: Language): Translations {
    const currentLang = lang || getLanguage();
    return currentLang === 'cs' ? cs : en;
}

/**
 * Translates a series name from English to the specified language.
 * Handles complex series names including:
 * - Base series names (e.g., "PCR Positivity")
 * - Averaged series (e.g., "PCR Positivity (28d avg)")
 * - Shifted series (e.g., "PCR Positivity shifted by 1 wave -347d")
 * - Test numbers (e.g., "PCR Positivity - Positive Tests")
 * 
 * @param seriesName - The series name in English
 * @param lang - Target language (optional, uses current language if not specified)
 * @returns Translated series name
 */
export function translateSeriesName(seriesName: string, lang?: Language): string {
    const currentLang = lang || getLanguage();
    
    // If English, return as is
    if (currentLang === 'en') {
        return seriesName;
    }
    
    const t = getTranslations(currentLang);
    let translated = seriesName;
    
    // Extract components from the series name
    // Pattern: "BaseName (Xd avg) shifted by Y wave Zd - Test Type"
    
    // 1. Extract and translate test type suffix (- Positive/Negative Tests)
    let testSuffix = '';
    if (translated.includes(' - Positive Tests')) {
        testSuffix = ` - ${t.seriesPositiveTests}`;
        translated = translated.replace(' - Positive Tests', '');
    } else if (translated.includes(' - Negative Tests')) {
        testSuffix = ` - ${t.seriesNegativeTests}`;
        translated = translated.replace(' - Negative Tests', '');
    }
    
    // 2. Extract and translate shift information
    let shiftSuffix = '';
    const shiftPatternWave = / shifted by (\d+) (wave|waves) \((-?\d+|NaN) days\)/;
    const shiftPatternDays = / shifted by (-?\d+) days/;
    
    const waveMatch = translated.match(shiftPatternWave);
    if (waveMatch) {
        const [full, count, waveWord, days] = waveMatch;
        const translatedWave = count === '1' ? t.seriesWave : t.seriesWaves;
        shiftSuffix = ` ${t.seriesShiftedBy} ${count} ${translatedWave} (${days} ${t.seriesDays})`;
        translated = translated.replace(full, '');
    } else {
        const daysMatch = translated.match(shiftPatternDays);
        if (daysMatch) {
            const [full, days] = daysMatch;
            shiftSuffix = ` ${t.seriesShiftedBy} ${days} ${t.seriesDays}`;
            translated = translated.replace(full, '');
        }
    }
    
    // 3. Extract and translate averaging suffix (Xd avg)
    let avgSuffix = '';
    const avgPattern = / \((\d+)d avg\)/;
    const avgMatch = translated.match(avgPattern);
    if (avgMatch) {
        const [full, days] = avgMatch;
        avgSuffix = ` (${days}${t.seriesAvgSuffix})`;
        translated = translated.replace(full, '');
    }
    
    // 4. Translate the base series name
    // Check if we have a direct mapping
    if (seriesNameMap[translated]) {
        translated = seriesNameMap[translated][currentLang];
    } else {
        // If no direct mapping, try to construct from components
        // This handles any edge cases or new series
        translated = translated
            .replace(/PCR Positivity/g, `PCR ${t.seriesPositivity}`)
            .replace(/Antigen Positivity/g, `${t.seriesAntigen} ${t.seriesPositivity}`)
            .replace(/Influenza Positivity/g, `${t.seriesInfluenza} ${t.seriesPositivity}`)
            .replace(/RSV Positivity/g, `${t.seriesRsv} ${t.seriesPositivity}`)
            .replace(/SARS-CoV-2 Positivity/g, `${t.seriesSarsCov2} ${t.seriesPositivity}`)
            .replace(/Influenza Wastewater/g, `${t.seriesInfluenza} ${t.seriesWastewater}`)
            .replace(/RSV Wastewater/g, `${t.seriesRsv} ${t.seriesWastewater}`)
            .replace(/SARS-CoV-2 Wastewater/g, `${t.seriesSarsCov2} ${t.seriesWastewater}`);
    }
    
    // 5. Reconstruct the full series name
    return translated + avgSuffix + shiftSuffix + testSuffix;
}

/**
 * Normalizes a series name to its English base form for storage purposes.
 * This ensures visibility settings are stored with language-independent keys.
 * 
 * @param seriesName - The series name in any language
 * @returns Series name normalized to English
 */
export function normalizeSeriesName(seriesName: string): string {
    // If it's already in English format (contains English keywords), return as is
    if (seriesName.includes('Positivity') || seriesName.includes('Wastewater')) {
        return seriesName;
    }
    
    // Otherwise, translate Czech back to English
    let normalized = seriesName;
    
    // 1. Reverse test type suffixes
    normalized = normalized
        .replace(/ - pozitivní testy/g, ' - Positive Tests')
        .replace(/ - negativní testy/g, ' - Negative Tests');
    
    // 2. Reverse shift information
    // Handle new format with parentheses: "posunuto o X vlna (Y dnů)" or "shifted by X wave (Y days)"
    normalized = normalized
        .replace(/ posunuto o (\d+) (vlna|vlny|vln) \((-?\d+|NaN) dnů\)/g, ' shifted by $1 wave ($3 days)')
        .replace(/ posunuto o (-?\d+) dnů/g, ' shifted by $1 days');
    
    // 3. Reverse averaging suffix
    normalized = normalized.replace(/ \((\d+)d prům\.\)/g, ' ($1d avg)');
    
    // 4. Reverse base series name translations
    normalized = normalized
        .replace(/PCR pozitivita/g, 'PCR Positivity')
        .replace(/Antigenní pozitivita/g, 'Antigen Positivity')
        .replace(/antigenní pozitivita/g, 'Antigen Positivity')
        .replace(/Chřipka pozitivita/g, 'Influenza Positivity')
        .replace(/chřipka pozitivita/g, 'Influenza Positivity')
        .replace(/RSV pozitivita/g, 'RSV Positivity')
        .replace(/SARS-CoV-2 pozitivita/g, 'SARS-CoV-2 Positivity')
        .replace(/Chřipka odpadní vody/g, 'Influenza Wastewater')
        .replace(/chřipka odpadní vody/g, 'Influenza Wastewater')
        .replace(/RSV odpadní vody/g, 'RSV Wastewater')
        .replace(/SARS-CoV-2 odpadní vody/g, 'SARS-CoV-2 Wastewater');
    
    return normalized;
}

