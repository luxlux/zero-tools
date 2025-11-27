/**
 * Order Input Page Adapters
 * DOM integration for the order input (trade-create) page
 */

import { PriceSource, PriceTarget, PriceType } from '../core/types';
import { ButtonFactory, ButtonConfig } from '../core/ButtonFactory';
import { PriceButtonController } from '../core/PriceButtonController';
import { attachTooltip } from '../utils/tooltipHelper';

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

/**
 * Full adapter for Order Input page - handles button creation and injection
 */
export class OrderInputAdapter {
    private controller: PriceButtonController;
    private target: OrderInputPriceTarget;

    constructor(controller: PriceButtonController, target: OrderInputPriceTarget) {
        this.controller = controller;
        this.target = target;
    }

    /**
     * Create main button (Ask/Bid)
     */
    createMainButton(
        priceType: 'bid' | 'ask',
        label: string,
        isFixedMode: boolean,
        isAutoCheck: boolean,
        isShiftHeld: boolean
    ): HTMLButtonElement {
        // Get display text from controller in fix mode
        const displayText = isFixedMode && this.controller
            ? this.controller.getMainButtonLabel(priceType, label)
            : label;

        const config: ButtonConfig = {
            type: 'main',
            label: isAutoCheck || isShiftHeld ? `${displayText} & Prüfen` : displayText,
            priceType: priceType,
            isAutoCheck: isAutoCheck || isShiftHeld,
            onClick: (e: MouseEvent) => this.handleMainButtonClick(e, priceType, isFixedMode, isAutoCheck)
        };

        const btn = ButtonFactory.createButton(config);

        // Add tooltip (not in fixed mode)
        if (!isFixedMode) {
            this.addTooltip(btn, priceType, 0, false);
        }

        return btn;
    }

    /**
     * Create offset button (+0.5%, -1%, etc.)
     */
    createOffsetButton(
        priceType: 'bid' | 'ask',
        offset: number,
        label: string,
        isFixedModeEnabled: boolean,
        isFixedPriceMode: boolean,
        isAutoCheck: boolean,
        isShiftHeld: boolean
    ): HTMLButtonElement {
        // Get display info from controller in fix price mode
        let displayLabel = label;
        let isNegativePrice = false;

        if (isFixedPriceMode && this.controller) {
            const buttonInfo = this.controller.getButtonDisplayInfo(priceType, offset);
            displayLabel = buttonInfo.label;
            isNegativePrice = buttonInfo.disabled;
        }

        const config: ButtonConfig = {
            type: 'offset',
            label: displayLabel,
            priceType: priceType,
            offset: offset,
            isAutoCheck: isAutoCheck || isShiftHeld,
            isDisabled: isNegativePrice,
            className: 'zd-btn zd-offset-btn',
            onClick: (e: MouseEvent) => this.handleOffsetButtonClick(e, priceType, offset, isFixedModeEnabled, isFixedPriceMode, isAutoCheck)
        };

        const btn = ButtonFactory.createButton(config);

        // Format label with opacity for 3rd+ decimals
        btn.innerHTML = ButtonFactory.formatButtonLabel(displayLabel);

        // Handle disabled negative prices
        if (isNegativePrice) {
            btn.style.minHeight = '20px';
            btn.style.cursor = 'not-allowed';
        }

        // Dynamic font sizing for long prices in fixed mode
        if (isFixedPriceMode) {
            const digitCount = displayLabel.replace(/[,\s]/g, '').length;
            if (digitCount > 7) {
                btn.style.width = 'auto';
            } else if (digitCount > 5) {
                btn.style.fontSize = '9px';
            }
        } else {
            // Add tooltip in normal mode
            this.addTooltip(btn, priceType, offset, isFixedModeEnabled);
        }

        // Store metadata
        btn.setAttribute('data-is-fixed-mode', isFixedModeEnabled.toString());

        return btn;
    }

    /**
     * Handle main button click
     */
    private handleMainButtonClick(
        e: MouseEvent,
        priceType: 'bid' | 'ask',
        isFixedMode: boolean,
        isAutoCheck: boolean
    ): void {
        const btn = e.target as HTMLElement;
        const tooltip = document.getElementById('zd-tooltip-el');
        if (tooltip) tooltip.style.display = 'none';

        let priceStr: string | null | undefined;

        if (isFixedMode) {
            // Get from controller
            const buttonInfo = this.controller.getButtonDisplayInfo(priceType, 0);
            priceStr = buttonInfo.price && buttonInfo.price !== '0' ? buttonInfo.price : null;
        } else {
            // Get current price from container
            const controls = btn.closest('.zero-delay-limit-controls');
            priceStr = controls?.getAttribute(`data-${priceType}`);
        }

        if (!priceStr) return;

        try {
            if ((window as any).chrome?.runtime?.id) {
                this.target.setPrice(priceStr, isAutoCheck || (e as MouseEvent).shiftKey);
            }
        } catch (err) {
            console.warn('Zero Tools: Extension context invalidated. Please reload the page.');
        }
    }

    /**
     * Handle offset button click
     */
    private handleOffsetButtonClick(
        e: MouseEvent,
        priceType: 'bid' | 'ask',
        offset: number,
        isFixedMode: boolean,
        isFixedPriceMode: boolean,
        isAutoCheck: boolean
    ): void {
        const btn = e.target as HTMLButtonElement;

        // Don't do anything if disabled (negative price)
        if (btn.disabled) return;

        const tooltip = document.getElementById('zd-tooltip-el');
        if (tooltip) tooltip.style.display = 'none';

        let priceStr: string | null | undefined;

        if (isFixedPriceMode) {
            // Get from controller
            const buttonInfo = this.controller.getButtonDisplayInfo(priceType, offset);
            priceStr = buttonInfo.price && buttonInfo.price !== '0' ? buttonInfo.price : null;
        } else {
            // Calculate from current price
            const controls = btn.closest('.zero-delay-limit-controls');
            const currentPriceStr = controls?.getAttribute(`data-${priceType}`);
            if (!currentPriceStr) return;

            const currentPrice = parseFloat(currentPriceStr);
            const decimals = this.getDecimalPlaces(currentPriceStr);

            const newPrice = isFixedMode
                ? currentPrice + offset
                : currentPrice * (1 + offset / 100);

            priceStr = newPrice.toFixed(decimals);
        }

        if (!priceStr) return;

        try {
            if ((window as any).chrome?.runtime?.id) {
                this.target.setPrice(priceStr, isAutoCheck || (e as MouseEvent).shiftKey);
            }
        } catch (err) {
            console.warn('Zero Tools: Extension context invalidated. Please reload the page.');
        }
    }

    /**
     * Add tooltip using shared helper
     */
    private addTooltip(
        btn: HTMLButtonElement,
        priceType: 'bid' | 'ask',
        offset: number = 0,
        isFixedMode: boolean = false
    ): void {
        attachTooltip(btn, {
            containerSelector: '.zero-delay-limit-controls',
            priceAttribute: `data-${priceType}`,
            offset: offset,
            isFixedMode: isFixedMode
        });
    }

    /**
     * Activate Fix Mode for both Bid and Ask
     */
    activateFixMode(): void {
        if (this.controller) {
            this.controller.activateFixMode('bid');
            this.controller.activateFixMode('ask');
        }
    }

    /**
     * Deactivate Fix Mode
     */
    deactivateFixMode(): void {
        if (this.controller) {
            this.controller.deactivateFixMode();
        }
    }


    /**
     * Get decimal places from price string
     */
    private getDecimalPlaces(str: string): number {
        if (str.indexOf('.') < 0) return 2;
        return str.split('.')[1].length;
    }
}
