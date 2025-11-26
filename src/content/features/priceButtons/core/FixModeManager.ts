/**
 * Fix Mode Manager - Handles freezing prices
 * NO DOM access - uses PriceSource interface
 */

import { PriceSource, PriceType, FixedPriceData } from './types';
import { getDecimals } from '../utils/priceFormatting';
import { calculatePercentageOffset, calculateFixedOffset } from '../utils/offsetCalculation';

export class FixModeManager {
    private isActive: boolean = false;
    private fixedData: FixedPriceData = {
        basePrice: {},
        offsetPrices: new Map()
    };

    /**
     * Activate Fix mode - freeze current prices
     */
    activate(source: PriceSource, priceType: PriceType, offsetMode: 'percentage' | 'fixed', offsets: number[]): void {
        const currentPrice = source.getCurrentPrice(priceType);
        if (!currentPrice) return;

        // Store base price
        this.fixedData.basePrice[priceType] = currentPrice;

        // Calculate and store all offset prices
        const decimals = getDecimals(currentPrice);

        this.fixedData.offsetPrices.clear();
        this.fixedData.offsetPrices.set('0', currentPrice); // Main button (offset 0)

        offsets.forEach(offset => {
            const key = `${offset >= 0 ? '+' : ''}${offset}`;

            const price = offsetMode === 'percentage'
                ? calculatePercentageOffset(currentPrice, offset, decimals)
                : calculateFixedOffset(currentPrice, offset, decimals);

            this.fixedData.offsetPrices.set(key, price);
        });

        this.isActive = true;
    }

    /**
     * Deactivate Fix mode
     */
    deactivate(): void {
        this.isActive = false;
        this.fixedData = {
            basePrice: {},
            offsetPrices: new Map()
        };
    }

    /**
     * Check if Fix mode is currently active
     */
    isFixModeActive(): boolean {
        return this.isActive;
    }

    /**
     * Get fixed price for a specific offset
     * @param offset - Offset value (0 for main button)
     * @returns Fixed price string or null
     */
    getFixedPrice(offset: number): string | null {
        if (!this.isActive) return null;

        const key = offset === 0 ? '0' : `${offset >= 0 ? '+' : ''}${offset}`;
        return this.fixedData.offsetPrices.get(key) || null;
    }

    /**
     * Get fixed base price for a specific price type
     */
    getFixedBasePrice(priceType: PriceType): string | null {
        if (!this.isActive) return null;
        return this.fixedData.basePrice[priceType] || null;
    }

    /**
     * Get all fixed offset prices (for debugging/testing)
     */
    getAllFixedPrices(): Map<string, string> {
        return new Map(this.fixedData.offsetPrices);
    }
}
