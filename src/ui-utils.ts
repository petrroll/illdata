// UI utility functions for creating and managing UI elements
// Extracted from main.ts to reduce duplication

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
        display: inline-block;
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
