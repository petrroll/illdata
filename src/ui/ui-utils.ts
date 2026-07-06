// UI utility functions for creating and managing UI elements
// Extracted from main.ts to reduce duplication

import { trendFromRatio } from '../utils';

/**
 * Creates a styled button element
 * @param text - Button text
 * @param backgroundColor - Background color (hex or CSS color)
 * @param options - Additional styling options
 * @returns Styled button element
 */
export function createStyledButton(
    text: string,
    backgroundColor: string,
    options?: {
        textDecoration?: string;
        hasBorderRight?: boolean;
        onClick?: () => void;
    }
): HTMLSpanElement {
    const button = document.createElement('span');
    const borderRight = options?.hasBorderRight ? 'border-right: 1px solid rgba(255, 255, 255, 0.3);' : '';
    button.style.cssText = `
        display: inline-flex;
        align-items: center;
        padding: 4px 8px;
        background-color: ${backgroundColor};
        color: white;
        font-size: 12px;
        cursor: pointer;
        user-select: none;
        ${borderRight}
        text-decoration: ${options?.textDecoration || 'none'};
    `;
    button.textContent = text;
    
    if (options?.onClick) {
        button.addEventListener('click', options.onClick);
    }
    
    return button;
}

/**
 * Creates a wrapper element for split pills
 * @param opacity - Initial opacity value
 * @param textDecoration - Initial text decoration
 * @returns Wrapper element
 */
export function createPillWrapper(opacity: string, textDecoration: string): HTMLSpanElement {
    const wrapper = document.createElement('span');
    wrapper.style.cssText = `
        display: inline-flex;
        border-radius: 4px;
        overflow: hidden;
        font-family: Arial, sans-serif;
        opacity: ${opacity};
        text-decoration: ${textDecoration};
    `;
    return wrapper;
}

/**
 * Updates the visual state of a pill wrapper and its buttons based on visibility
 * @param wrapper - The pill wrapper element
 * @param buttons - Array of button elements to update
 * @param isVisible - Whether any part of the pill is visible
 */
export function updatePillVisibility(
    wrapper: HTMLElement,
    buttons: HTMLElement[],
    isVisible: boolean
): void {
    wrapper.style.opacity = isVisible ? '1' : '0.5';
    wrapper.style.textDecoration = isVisible ? 'none' : 'line-through';
    buttons.forEach(button => {
        button.style.textDecoration = isVisible ? 'none' : 'line-through';
    });
}

// Trend indicator colors mirror the trends table (rising incidence is a negative
// signal shown in red, falling incidence a positive signal shown in green).
const TREND_DOT_COLORS: Record<'positive' | 'negative' | 'neutral', string> = {
    negative: '#e53935', // rising / bad
    positive: '#43a047', // falling / good
    neutral: 'rgba(255, 255, 255, 0.55)', // stable
};

/**
 * Creates a small circular trend indicator ("red/green light") for a series pill.
 *
 * The color reflects the 28-day trend of the underlying series: red when incidence is
 * rising, green when falling and a subtle neutral dot when stable. Returns null when the
 * trend is unknown (e.g. no data) so no dot is rendered.
 *
 * @param ratio28days - The 28-day period ratio for the series (recent avg / prior avg)
 * @param title - Optional tooltip text describing the trend
 * @returns A styled dot element, or null when the trend is unknown
 */
export function createTrendDot(ratio28days: number | null, title?: string): HTMLSpanElement | null {
    const trend = trendFromRatio(ratio28days);
    if (trend === 'unknown') return null;

    const dot = document.createElement('span');
    dot.className = 'trend-dot';
    dot.style.cssText = `
        display: inline-block;
        width: 8px;
        height: 8px;
        margin-right: 5px;
        border-radius: 50%;
        background-color: ${TREND_DOT_COLORS[trend]};
        box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.9);
        vertical-align: middle;
        flex: 0 0 auto;
    `;
    if (title) dot.title = title;
    return dot;
}
