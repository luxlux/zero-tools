/**
 * Price Button Controller - Core business logic
 * Creates and manages price buttons without direct DOM knowledge
 */

import { PriceSource, PriceTarget, ButtonConfig, PriceType, ButtonDisplayInfo } from './types';
import { FixModeManager } from './FixModeManager';
import { formatPrice, formatPriceWithOpacity, formatButtonLabel } from '../utils/priceFormatting';
import { calculatePercentageOffset, calculateFixedOffset, generateOffsetValues } from '../utils/offsetCalculation';

export class PriceButtonController {
    private fixManager: FixModeManager;
    private offsetValues: number[];

    constructor(
        private source: PriceSource,
        private target: PriceTarget,
        private config: ButtonConfig
    ) {
        this.fixManager = new FixModeManager();

        // Generate offset values based on config
        this.offsetValues = generateOffsetValues(
            config.offsetMode,
            config.offsetStep || 0.05,
            config.offsetCount || 10,
            config.customOffsets
        );
    }

    /**
     * Check if Fix mode is active
     */
    isFixModeActive(): boolean {
        return this.fixManager.isFixModeActive();
    }

    /**
     * Activate Fix mode - freezes current prices
     */
    activateFixMode(priceType: PriceType): void {
        this.fixManager.activate(
            this.source,
            priceType,
            this.config.offsetMode,
            this.offsetValues
        );
    }

    /**
     * Deactivate Fix mode
     */
    deactivateFixMode(): void {
        this.fixManager.deactivate();
    }

    /**
     * Toggle Fix mode
     */
    toggleFixMode(priceType: PriceType): void {
        if (this.fixManager.isFixModeActive()) {
            this.deactivateFixMode();
        } else {
            this.activateFixMode(priceType);
        }
    }

    /**
     * Get button display info for a specific offset
     */
    getButtonDisplayInfo(priceType: PriceType, offset: number): ButtonDisplayInfo {
        let price: string;
        let label: string;

        if (this.fixManager.isFixModeActive()) {
            // Fixed price mode
            const fixedPrice = this.fixManager.getFixedPrice(offset);
            if (!fixedPrice) {
                return { label: '', disabled: true, opacity: 0.3, price: '0' };
            }

            price = fixedPrice;

            // Format for display (absolute value, no +/-)
            label = formatPrice(fixedPrice);

            // Check if price is negative
            const numPrice = parseFloat(fixedPrice.replace(',', '.'));
            if (numPrice < 0) {
                return { label: '\u200B', disabled: true, opacity: 0.3, price: '0' };
            }

        } else {
            // Dynamic price mode
            const currentPrice = this.source.getCurrentPrice(priceType);
            if (!currentPrice) {
                return { label: '', disabled: true, opacity: 0.3, price: '0' };
            }

            const decimals = currentPrice.includes('.') ? currentPrice.split('.')[1].length : 2;

            // Calculate offset price
            price = this.config.offsetMode === 'percentage'
                ? calculatePercentageOffset(currentPrice, offset, decimals)
                : calculateFixedOffset(currentPrice, offset, decimals);

            // Format label with +/- prefix
            const sign = offset >= 0 ? '+' : '';
            const offsetLabel = this.config.offsetMode === 'percentage'
                ? `${sign}${offset.toString().replace('.', ',')}%`
                : `${sign}${offset.toString().replace('.', ',')}`;

            label = offsetLabel;

            // Check if price is negative
            const numPrice = parseFloat(price.replace(',', '.'));
            if (numPrice < 0) {
                return { label: '\u200B', disabled: true, opacity: 0.3, price: '0' };
            }
        }

        return {
            label,
            disabled: false,
            opacity: 1,
            price
        };
    }

    /**
     * Get main button label
     */
    getMainButtonLabel(priceType: PriceType, defaultLabel: string): string {
        if (this.fixManager.isFixModeActive()) {
            const fixedPrice = this.fixManager.getFixedBasePrice(priceType);
            if (fixedPrice) {
                return formatPrice(fixedPrice) + ' als Limit';
            }
        }
        return defaultLabel;
    }

    /**
     * Handle button click
     */
    handleButtonClick(priceType: PriceType, offset: number): void {
        let price: string;

        if (this.fixManager.isFixModeActive()) {
            // Use fixed price
            const fixedPrice = offset === 0
                ? this.fixManager.getFixedBasePrice(priceType)
                : this.fixManager.getFixedPrice(offset);

            if (!fixedPrice) return;
            price = fixedPrice;

        } else {
            // Calculate dynamic price
            const currentPrice = this.source.getCurrentPrice(priceType);
            if (!currentPrice) return;

            const decimals = currentPrice.includes('.') ? currentPrice.split('.')[1].length : 2;

            price = offset === 0
                ? currentPrice
                : (this.config.offsetMode === 'percentage'
                    ? calculatePercentageOffset(currentPrice, offset, decimals)
                    : calculateFixedOffset(currentPrice, offset, decimals));
        }

        // Set the price via target
        this.target.setPrice(price, this.config.autoCheck);
    }

    /**
     * Get all offset values
     */
    getOffsetValues(): number[] {
        return [...this.offsetValues];
    }

    /**
     * Update configuration (for step size changes)
     */
    updateConfig(newConfig: Partial<ButtonConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Regenerate offset values if relevant config changed
        if (newConfig.offsetStep || newConfig.offsetCount || newConfig.customOffsets) {
            this.offsetValues = generateOffsetValues(
                this.config.offsetMode,
                this.config.offsetStep || 0.05,
                this.config.offsetCount || 10,
                this.config.customOffsets
            );

            // If Fix mode active, need to recalculate fixed prices
            // For now, we deactivate Fix mode when config changes
            if (this.fixManager.isFixModeActive()) {
                this.deactivateFixMode();
            }
        }
    }
}
