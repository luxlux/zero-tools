/**
 * Pure price calculation utilities
 * NO DOM access, NO side effects
 */

/**
 * Calculate price with percentage offset
 * @param basePrice - Base price as string
 * @param offsetPercent - Offset in percent (e.g., 0.5 for +0.5%)
 * @param decimals - Number of decimal places to use
 * @returns Calculated price as string
 */
export const calculatePercentageOffset = (
    basePrice: string,
    offsetPercent: number,
    decimals: number
): string => {
    const base = parseFloat(basePrice.replace(',', '.'));
    if (isNaN(base)) return basePrice;

    const offsetValue = base * (offsetPercent / 100);
    const result = base + offsetValue;

    return result.toFixed(decimals);
};

/**
 * Calculate price with fixed euro offset
 * @param basePrice - Base price as string
 * @param offsetEuro - Offset in euros (e.g., 5 for +5€)
 * @param decimals - Number of decimal places to use
 * @returns Calculated price as string
 */
export const calculateFixedOffset = (
    basePrice: string,
    offsetEuro: number,
    decimals: number
): string => {
    const base = parseFloat(basePrice.replace(',', '.'));
    if (isNaN(base)) return basePrice;

    const result = base + offsetEuro;

    return result.toFixed(decimals);
};

/**
 * Generate array of offset values based on configuration
 * @param mode - 'percentage' or 'fixed'
 * @param step - Step size
 * @param count - Number of values to generate (per side)
 * @param customOffsets - Custom values (if provided)
 * @returns Array of offset values (positive and negative)
 */
export const generateOffsetValues = (
    mode: 'percentage' | 'fixed',
    step: number,
    count: number,
    customOffsets?: number[]
): number[] => {
    if (customOffsets && customOffsets.length > 0) {
        return customOffsets;
    }

    const values: number[] = [];

    for (let i = 1; i <= count; i++) {
        const value = step * i;
        values.push(value);   // Positive
        values.push(-value);  // Negative
    }

    return values;
};
