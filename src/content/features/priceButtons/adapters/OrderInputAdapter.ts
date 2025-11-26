/**
 * Order Input Page Adapters
 * DOM integration for the order input (trade-create) page
 */

import { PriceSource, PriceTarget, PriceType } from '../core/types';

/**
 * Reads prices from Order Input page DOM
 */
export class OrderInputPriceSource implements PriceSource {
    getCurrentPrice(type: PriceType): string | null {
        const container = document.querySelector('.zero-delay-limit-controls');
        if (!container) return null;

        return container.getAttribute(`data-${type}`) || null;
    }

    onPriceUpdate(callback: () => void): void {
        // Prices are updated via processTimestamps() which runs every second
        // We don't need additional listeners here
        // The controller will call this if it needs real-time updates
    }

    getAvailablePrices() {
        const container = document.querySelector('.zero-delay-limit-controls');

        if (!container) {
            return { hasBid: false, hasAsk: false, hasSingle: false };
        }

        return {
            hasBid: container.getAttribute('data-has-bid') === 'true',
            hasAsk: container.getAttribute('data-has-ask') === 'true',
            hasSingle: container.getAttribute('data-has-single') === 'true',
        };
    }
}

/**
 * Sets prices on Order Input page
 */
export class OrderInputPriceTarget implements PriceTarget {
    setPrice(price: string, autoCheck: boolean): void {
        // Use the existing setLimitValue function from index.ts
        // This is OK - we're calling a function that handles DOM internally
        (window as any).setLimitValue?.(price, autoCheck);
    }
}
