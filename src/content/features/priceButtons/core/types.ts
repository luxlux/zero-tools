/**
 * Core type definitions for Price Buttons feature
 * 
 * These interfaces define the contract between core logic and adapters.
 * NO DOM types should appear here!
 */

/** Price type available in the trading interface */
export type PriceType = 'bid' | 'ask' | 'single';

/** Where to get current market prices */
export interface PriceSource {
    /** Get current price for a specific type */
    getCurrentPrice(type: PriceType): string | null;

    /** Subscribe to price updates (called when prices change) */
    onPriceUpdate(callback: () => void): void;

    /** Check what price types are available on current page */
    getAvailablePrices(): {
        hasBid: boolean;
        hasAsk: boolean;
        hasSingle: boolean;
    };
}

/** Where to send the selected price */
export interface PriceTarget {
    /** 
     * Set the limit price in the order form
     * @param price - The price to set (formatted string, e.g., "24110.50")
     * @param autoCheck - Whether to automatically proceed to confirmation page
     */
    setPrice(price: string, autoCheck: boolean): void;
}

/** Button configuration from user settings */
export interface ButtonConfig {
    /** Offset mode: percentage or fixed euro amounts */
    offsetMode: 'percentage' | 'fixed';

    /** Custom offset values (used when in custom mode) */
    customOffsets?: number[];

    /** Step size for incremental offsets */
    offsetStep?: number;

    /** Number of offset buttons to display */
    offsetCount?: number;

    /** Whether to auto-navigate to confirmation after clicking */
    autoCheck: boolean;

    /** Current step size (for < > controls on Confirm page) */
    currentStepSize?: number;
}

/** Price data for Fix mode */
export interface FixedPriceData {
    /** Base prices when Fix mode was activated */
    basePrice: { [key in PriceType]?: string };

    /** Calculated offset prices (key: "+0.5" or "+5", value: "24110.50") */
    offsetPrices: Map<string, string>;
}

/** Button display info */
export interface ButtonDisplayInfo {
    /** Text to display on button */
    label: string;

    /** Whether button should be disabled */
    disabled: boolean;

    /** Opacity for styling (0-1) */
    opacity: number;

    /** Price value this button represents */
    price: string;
}
