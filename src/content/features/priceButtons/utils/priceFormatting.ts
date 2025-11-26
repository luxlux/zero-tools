/**
 * Pure price formatting utilities
 * NO DOM access, NO side effects
 */

/**
 * Format price for display (handles decimals with opacity)
 * @param price - Price as string (e.g., "24110.50")
 * @returns Formatted price with thousands separator
 */
export const formatPrice = (price: string): string => {
    const cleaned = price.replace(',', '.');
    const num = parseFloat(cleaned);

    if (isNaN(num)) return price;

    return num.toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 5
    });
};

/**
 * Format price with reduced opacity for extra decimals
 * Returns HTML string with span for opacity
 */
export const formatPriceWithOpacity = (price: string): string => {
    const formatted = price.replace('.', ',');
    const parts = formatted.split(',');

    if (parts.length === 2 && parts[1].length > 2) {
        const mainPart = parts[0];
        const firstTwoDecimals = parts[1].substring(0, 2);
        const extraDecimals = parts[1].substring(2);
        return `${mainPart},${firstTwoDecimals}<span style="opacity: 0.5;">${extraDecimals}</span>`;
    }

    return formatted;
};

/**
 * Get number of decimal places in a price string
 */
export const getDecimals = (priceStr: string): number => {
    const cleaned = priceStr.replace(',', '.');
    if (cleaned.indexOf('.') < 0) return 2;
    return cleaned.split('.')[1].length;
};

/**
 * Format button label with dynamic font size for long prices
 */
export const formatButtonLabel = (label: string): string => {
    const digitCount = label.replace(/[^0-9]/g, '').length;

    if (digitCount > 7) {
        return `<span style="font-size: 8px; white-space: nowrap;">${label}</span>`;
    } else if (digitCount > 5) {
        return `<span style="font-size: 9px;">${label}</span>`;
    }

    return label;
};
