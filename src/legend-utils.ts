// Legend utility functions for creating custom HTML legends
// Extracted from main.ts to reduce duplication

import { Chart } from 'chart.js/auto';
import { createStyledButton, createPillWrapper, updatePillVisibility } from './ui-utils';
import { getTranslations, normalizeSeriesName, translateSeriesName } from './locales';

// Constants from main.ts
const SHIFTED_SERIES_IDENTIFIER = 'shifted';

// Re-export for use in main.ts
export { SHIFTED_SERIES_IDENTIFIER };

/**
 * Configuration for a chart
 */
export interface ChartConfig {
    containerId: string;
    canvasId: string;
    data: any;
    title: string;
    shortTitle: string;
    visibilityKey: string;
    chartHolder: { chart: Chart | undefined };
    datasetVisibility: { [key: string]: boolean };
    canvas?: HTMLCanvasElement | null;
    extremesCache?: any;
    hasCountryFilter?: boolean;
    countryFilterKey?: string;
}

/**
 * Updates dataset visibility in localStorage and chart metadata
 * @param cfg - Chart configuration
 * @param chart - Chart.js chart instance
 * @param datasetIndex - Index of the dataset to update
 * @param dataset - The dataset object
 * @param normalizedLabel - Normalized (English) label of the dataset
 * @param newVisibility - New visibility state
 * @param updateRatioTable - Callback to update the ratio table
 */
export function updateDatasetVisibility(
    cfg: ChartConfig,
    chart: Chart,
    datasetIndex: number,
    dataset: any,
    normalizedLabel: string,
    newVisibility: boolean,
    updateRatioTable: () => void
): void {
    cfg.datasetVisibility[normalizedLabel] = newVisibility;
    localStorage.setItem(cfg.visibilityKey, JSON.stringify(cfg.datasetVisibility));
    
    const meta = chart.getDatasetMeta(datasetIndex);
    meta.hidden = !newVisibility;
    dataset.hidden = !newVisibility;
    
    chart.update();
    updateRatioTable();
}

/**
 * Helper function to create a regular legend button (non-test datasets)
 */
export function createRegularLegendButton(
    container: HTMLElement,
    chart: Chart,
    cfg: ChartConfig,
    dataset: any,
    index: number,
    updateRatioTable: () => void
) {
    const datasetLabel = dataset.label || `Dataset ${index}`;
    const normalizedLabel = normalizeSeriesName(datasetLabel);
    const isHidden = !cfg.datasetVisibility[normalizedLabel];
    
    const legendItem = createStyledButton(
        datasetLabel,
        dataset.borderColor || dataset.backgroundColor || '#666',
        {
            textDecoration: isHidden ? 'line-through' : 'none',
            onClick: () => {
                const currentlyHidden = !cfg.datasetVisibility[normalizedLabel];
                const newVisibility = currentlyHidden;
                
                updateDatasetVisibility(cfg, chart, index, dataset, normalizedLabel, newVisibility, updateRatioTable);
                
                legendItem.style.opacity = newVisibility ? '1' : '0.5';
                legendItem.style.textDecoration = newVisibility ? 'none' : 'line-through';
            }
        }
    );
    
    legendItem.style.borderRadius = '4px';
    legendItem.style.opacity = isHidden ? '0.5' : '1';
    legendItem.style.fontFamily = 'Arial, sans-serif';
    
    container.appendChild(legendItem);
}

/**
 * Helper function to create a split pill for positive/negative test pairs
 */
export function createSplitTestPill(
    container: HTMLElement,
    chart: Chart,
    cfg: ChartConfig,
    positiveDataset: any,
    positiveIndex: number,
    negativeDataset: any,
    negativeIndex: number,
    baseSeriesName: string,
    updateRatioTable: () => void
) {
    const t = getTranslations();
    
    // Get visibility states
    const positiveLabel = normalizeSeriesName(positiveDataset.label || '');
    const negativeLabel = normalizeSeriesName(negativeDataset.label || '');
    const positiveVisible = cfg.datasetVisibility[positiveLabel] !== false;
    const negativeVisible = cfg.datasetVisibility[negativeLabel] !== false;
    const neitherVisible = !positiveVisible && !negativeVisible;
    
    // Create wrapper for the split pill
    const pillWrapper = createPillWrapper(
        neitherVisible ? '0.5' : '1',
        neitherVisible ? 'line-through' : 'none'
    );
    
    // Create common prefix button (toggles both)
    const displayName = translateSeriesName(baseSeriesName);
    const prefixButton = createStyledButton(displayName, '#666', {
        hasBorderRight: true,
        textDecoration: neitherVisible ? 'line-through' : 'none'
    });
    
    // Create positive tests button
    const positiveButton = createStyledButton(
        t.seriesPositiveTests,
        positiveDataset.borderColor || positiveDataset.backgroundColor || '#666',
        {
            hasBorderRight: true,
            textDecoration: positiveVisible ? 'none' : 'line-through'
        }
    );
    
    // Create negative tests button
    const negativeButton = createStyledButton(
        t.seriesNegativeTests,
        negativeDataset.borderColor || negativeDataset.backgroundColor || '#666',
        {
            textDecoration: negativeVisible ? 'none' : 'line-through'
        }
    );
    
    // Add click handler for prefix (toggles both)
    prefixButton.addEventListener('click', () => {
        const currentPositiveVisible = cfg.datasetVisibility[positiveLabel] !== false;
        const currentNegativeVisible = cfg.datasetVisibility[negativeLabel] !== false;
        const currentBothVisible = currentPositiveVisible && currentNegativeVisible;
        const newVisibility = !currentBothVisible;
        
        // Update both datasets
        updateDatasetVisibility(cfg, chart, positiveIndex, positiveDataset, positiveLabel, newVisibility, updateRatioTable);
        updateDatasetVisibility(cfg, chart, negativeIndex, negativeDataset, negativeLabel, newVisibility, updateRatioTable);
        
        // Update UI
        updatePillVisibility(pillWrapper, [prefixButton, positiveButton, negativeButton], newVisibility);
    });
    
    // Add click handler for positive tests only
    positiveButton.addEventListener('click', () => {
        const currentPositiveVisible = cfg.datasetVisibility[positiveLabel] !== false;
        const newVisibility = !currentPositiveVisible;
        
        updateDatasetVisibility(cfg, chart, positiveIndex, positiveDataset, positiveLabel, newVisibility, updateRatioTable);
        
        positiveButton.style.textDecoration = newVisibility ? 'none' : 'line-through';
        
        // Update wrapper based on both states
        const currentNegativeVisible = cfg.datasetVisibility[negativeLabel] !== false;
        const anyVisible = newVisibility || currentNegativeVisible;
        updatePillVisibility(pillWrapper, [prefixButton], anyVisible);
    });
    
    // Add click handler for negative tests only
    negativeButton.addEventListener('click', () => {
        const currentNegativeVisible = cfg.datasetVisibility[negativeLabel] !== false;
        const newVisibility = !currentNegativeVisible;
        
        updateDatasetVisibility(cfg, chart, negativeIndex, negativeDataset, negativeLabel, newVisibility, updateRatioTable);
        
        negativeButton.style.textDecoration = newVisibility ? 'none' : 'line-through';
        
        // Update wrapper based on both states
        const currentPositiveVisible = cfg.datasetVisibility[positiveLabel] !== false;
        const anyVisible = currentPositiveVisible || newVisibility;
        updatePillVisibility(pillWrapper, [prefixButton], anyVisible);
    });
    
    // Assemble the split pill
    pillWrapper.appendChild(prefixButton);
    pillWrapper.appendChild(positiveButton);
    pillWrapper.appendChild(negativeButton);
    
    container.appendChild(pillWrapper);
}

/**
 * Extracts a shortened shift suffix from a series label for display in a pill.
 */
function extractShiftSuffix(label: string): string {
    const normalizedLabel = normalizeSeriesName(label);
    
    // Pattern 1: Wave-based shift
    const wavePattern = /shifted by (\d+) (waves?) ((?:-?\d+|NaN))d/;
    const waveMatch = normalizedLabel.match(wavePattern);
    if (waveMatch) {
        const waveCount = waveMatch[1];
        const waveWord = waveMatch[2];
        const days = waveMatch[3];
        return `shifted by ${waveCount} ${waveWord} (${days} days)`;
    }
    
    // Pattern 2: Custom day shift
    const dayPattern = /shifted by (-?\d+)d/;
    const dayMatch = normalizedLabel.match(dayPattern);
    if (dayMatch) {
        return `shifted by ${dayMatch[1]} days`;
    }
    
    return '';
}

/**
 * Translates a shift suffix text to the current language.
 */
function translateShiftSuffix(shiftSuffix: string): string {
    const t = getTranslations();
    const currentLang = t.seriesShiftedBy === 'posunuto o' ? 'cs' : 'en';
    
    if (currentLang === 'en' || !shiftSuffix) {
        return shiftSuffix;
    }
    
    // Pattern 1: Wave-based shift
    const wavePattern = /shifted by (\d+) (wave|waves) \((-?\d+|NaN) days\)/;
    const waveMatch = shiftSuffix.match(wavePattern);
    if (waveMatch) {
        const [, count, waveWord, days] = waveMatch;
        const translatedWave = count === '1' ? t.seriesWave : t.seriesWaves;
        const daysWord = 'dnů';
        return `${t.seriesShiftedBy} ${count} ${translatedWave} (${days} ${daysWord})`;
    }
    
    // Pattern 2: Day-based shift
    const dayPattern = /shifted by (-?\d+) days/;
    const dayMatch = shiftSuffix.match(dayPattern);
    if (dayMatch) {
        const [, days] = dayMatch;
        const daysWord = 'dnů';
        return `${t.seriesShiftedBy} ${days} ${daysWord}`;
    }
    
    return shiftSuffix;
}

/**
 * Helper function to create a split pill for base/shifted series pairs
 */
export function createSplitShiftedPill(
    container: HTMLElement,
    chart: Chart,
    cfg: ChartConfig,
    baseDataset: any,
    baseIndex: number,
    shiftedDataset: any,
    shiftedIndex: number,
    baseSeriesName: string,
    updateRatioTable: () => void
) {
    // Get visibility states
    const baseLabel = normalizeSeriesName(baseDataset.label || '');
    const shiftedLabel = normalizeSeriesName(shiftedDataset.label || '');
    const baseVisible = cfg.datasetVisibility[baseLabel] !== false;
    const shiftedVisible = cfg.datasetVisibility[shiftedLabel] !== false;
    const neitherVisible = !baseVisible && !shiftedVisible;
    
    // Create wrapper for the split pill
    const pillWrapper = createPillWrapper(
        neitherVisible ? '0.5' : '1',
        neitherVisible ? 'line-through' : 'none'
    );
    
    // Create base series button
    const displayName = translateSeriesName(baseSeriesName);
    const baseButton = createStyledButton(
        displayName,
        baseDataset.borderColor || baseDataset.backgroundColor || '#666',
        {
            hasBorderRight: true,
            textDecoration: baseVisible ? 'none' : 'line-through'
        }
    );
    
    // Create shifted series button
    const shiftSuffix = extractShiftSuffix(shiftedDataset.label || '');
    const translatedShiftSuffix = translateShiftSuffix(shiftSuffix);
    const shiftedButton = createStyledButton(
        translatedShiftSuffix || 'shifted',
        shiftedDataset.borderColor || shiftedDataset.backgroundColor || '#666',
        {
            textDecoration: shiftedVisible ? 'none' : 'line-through'
        }
    );
    
    // Add click handler for base series only
    baseButton.addEventListener('click', () => {
        const currentBaseVisible = cfg.datasetVisibility[baseLabel] !== false;
        const newVisibility = !currentBaseVisible;
        
        updateDatasetVisibility(cfg, chart, baseIndex, baseDataset, baseLabel, newVisibility, updateRatioTable);
        
        baseButton.style.textDecoration = newVisibility ? 'none' : 'line-through';
        
        // Update wrapper based on both states
        const currentShiftedVisible = cfg.datasetVisibility[shiftedLabel] !== false;
        const anyVisible = newVisibility || currentShiftedVisible;
        updatePillVisibility(pillWrapper, [baseButton, shiftedButton], anyVisible);
    });
    
    // Add click handler for shifted series only
    shiftedButton.addEventListener('click', () => {
        const currentShiftedVisible = cfg.datasetVisibility[shiftedLabel] !== false;
        const newVisibility = !currentShiftedVisible;
        
        updateDatasetVisibility(cfg, chart, shiftedIndex, shiftedDataset, shiftedLabel, newVisibility, updateRatioTable);
        
        shiftedButton.style.textDecoration = newVisibility ? 'none' : 'line-through';
        
        // Update wrapper based on both states
        const currentBaseVisible = cfg.datasetVisibility[baseLabel] !== false;
        const anyVisible = currentBaseVisible || newVisibility;
        updatePillVisibility(pillWrapper, [baseButton, shiftedButton], anyVisible);
    });
    
    // Assemble the split pill (2 parts: base + shifted)
    pillWrapper.appendChild(baseButton);
    pillWrapper.appendChild(shiftedButton);
    
    container.appendChild(pillWrapper);
}
