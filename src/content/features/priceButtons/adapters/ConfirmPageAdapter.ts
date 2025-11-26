/**
 * Confirm Page Adapters
 * DOM integration for the order confirmation (trade-confirm) page
 */

import { PriceSource, PriceTarget, PriceType } from '../core/types';

/**
 * Reads prices from Confirm page DOM
 */
export class ConfirmPagePriceSource implements PriceSource {
    getCurrentPrice(type: PriceType): string | null {
        const confirmPage = document.querySelector('trade-confirm');
        if (!confirmPage) return null;

        const upperDiv = confirmPage.querySelector('.d-flex.justify-content-between.upper');
        if (!upperDiv) return null;

        const quoteIndicator = upperDiv.querySelector('.quoteindicator');
        if (!quoteIndicator) return null;

        const quoteText = quoteIndicator.textContent?.trim() || '';

        // Parse prices - format: "17,560 € / 17,550 €" or just "17,550 €"
        const prices = quoteText.split('/').map(p => p.trim().replace('€', '').trim());

        if (type === 'bid' && prices.length === 2) {
            return prices[0]; // First price is Bid
        } else if (type === 'ask' && prices.length === 2) {
            return prices[1]; // Second price is Ask
        } else if (type === 'single' && prices.length === 1) {
            return prices[0]; // Single price
        }

        return null;
    }

    onPriceUpdate(callback: () => void): void {
        // Prices updated via processTimestamps() every second
    }

    getAvailablePrices() {
        const currentPrice = this.getCurrentPrice('single');

        if (currentPrice) {
            return { hasBid: false, hasAsk: false, hasSingle: true };
        }

        // Check if Bid/Ask available
        const bidPrice = this.getCurrentPrice('bid');
        const askPrice = this.getCurrentPrice('ask');

        return {
            hasBid: bidPrice !== null,
            hasAsk: askPrice !== null,
            hasSingle: false
        };
    }
}

/**
 * Sets prices on Confirm page (modifies existing limit order)
 */
export class ConfirmPagePriceTarget implements PriceTarget {
    setPrice(price: string, autoCheck: boolean): void {
        // Use the existing setLimitValue function
        // On Confirm page, this modifies the existing order
        (window as any).setLimitValue?.(price, autoCheck);
    }
}
