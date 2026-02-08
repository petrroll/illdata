// Color utility functions
// Extracted from main.ts for testability and reuse

/**
 * Adjusts the color for test bar charts by adjusting saturation and lightness
 * to create better contrast between positive and negative test bars.
 * Positive tests are more saturated, negative tests are less saturated.
 * 
 * @param hexColor - The original color in hex format (e.g., "#1f77b4")
 * @param isPositive - Whether this is for positive tests (more saturated) or negative tests (less saturated)
 * @returns The adjusted color in hex format
 */
export function adjustColorForTestBars(hexColor: string, isPositive: boolean): string {
    // Color adjustment constants
    const POSITIVE_SATURATION_FACTOR = 0.85; // Keep most saturation for positive tests
    const NEGATIVE_SATURATION_FACTOR = 0.4; // Reduce saturation more for negative tests
    const POSITIVE_LIGHTNESS_REDUCTION = 0.05; // Slightly darken positive tests to maintain saturation appearance
    const POSITIVE_LIGHTNESS_MIN = 0.3; // Floor positive lightness
    const NEGATIVE_LIGHTNESS_BOOST = 0.15; // Lighten negative tests for contrast
    const NEGATIVE_LIGHTNESS_MAX = 0.75; // Cap negative lightness

    // Convert hex to RGB
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;

    // Convert RGB to HSL
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    // Adjust saturation and lightness for contrast
    // Positive tests: more saturated and slightly darker
    // Negative tests: less saturated and lighter
    if (isPositive) {
        s = s * POSITIVE_SATURATION_FACTOR;
        l = Math.max(l - POSITIVE_LIGHTNESS_REDUCTION, POSITIVE_LIGHTNESS_MIN);
    } else {
        s = s * NEGATIVE_SATURATION_FACTOR;
        l = Math.min(l + NEGATIVE_LIGHTNESS_BOOST, NEGATIVE_LIGHTNESS_MAX);
    }

    // Convert HSL back to RGB
    const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };

    let r2, g2, b2;
    if (s === 0) {
        r2 = g2 = b2 = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1/3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1/3);
    }

    // Convert back to hex
    const toHex = (c: number) => {
        const hex = Math.round(c * 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r2)}${toHex(g2)}${toHex(b2)}`;
}
