/**
 * Confirm Page Adapters
 * DOM integration for the order confirmation (trade-confirm) page
 */

import { PriceSource, PriceTarget, PriceType } from '../core/types';
import { ButtonFactory, ButtonConfig } from '../core/ButtonFactory';
import { PriceButtonController } from '../core/PriceButtonController';

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

/**
 * Full adapter for Confirm page - handles button creation and injection
 */
export class ConfirmPageAdapter {
    private controller: PriceButtonController;
    private target: ConfirmPagePriceTarget;

    constructor(controller: PriceButtonController, target: ConfirmPagePriceTarget) {
        this.controller = controller;
        this.target = target;
    }

    /**
     * Create main button (single price on Confirm page)
     */
    createMainButton(
        label: string,
        isFixedMode: boolean
    ): HTMLButtonElement {
        // Controller already adds "als Limit" for Confirm page, don't add it again
        const displayText = isFixedMode && this.controller
            ? this.controller.getMainButtonLabel('single', label)
            : label;

        const config: ButtonConfig = {
            type: 'main',
            label: displayText,
            priceType: 'single',
            isAutoCheck: true,  // Confirm buttons always auto-check (navigate + set + check)
            onClick: async (e) => await this.handleMainButtonClick(e, isFixedMode)
        };

        const btn = ButtonFactory.createButton(config);

        // Confirm buttons use innerHTML for formatted label
        btn.innerHTML = ButtonFactory.formatButtonLabel(displayText);

        // No tooltip in fixed mode
        if (!isFixedMode) {
            this.addTooltip(btn, 0, false);
        }

        return btn;
    }

    /**
     * Create offset button
     */
    createOffsetButton(
        offset: number,
        label: string,
        isFixedModeEnabled: boolean,
        isFixedPriceMode: boolean
    ): HTMLButtonElement {
        let displayLabel = label;
        let isNegativePrice = false;

        if (isFixedPriceMode && this.controller) {
            const buttonInfo = this.controller.getButtonDisplayInfo('single', offset);
            displayLabel = buttonInfo.label;
            isNegativePrice = buttonInfo.disabled;
        }

        const config: ButtonConfig = {
            type: 'offset',
            label: displayLabel,
            priceType: 'single',
            offset: offset,
            isAutoCheck: true,  // Confirm buttons always auto-check
            isDisabled: isNegativePrice,
            className: 'zd-btn zd-offset-btn',
            onClick: async (e) => await this.handleOffsetButtonClick(e, offset, isFixedModeEnabled, isFixedPriceMode)
        };

        const btn = ButtonFactory.createButton(config);

        // Format label
        btn.innerHTML = ButtonFactory.formatButtonLabel(displayLabel);

        // Handle disabled negative prices
        if (isNegativePrice) {
            btn.style.minHeight = '20px';
            btn.style.cursor = 'not-allowed';
        }

        // Dynamic font sizing for long prices
        if (isFixedPriceMode && !isNegativePrice) {
            const digitCount = displayLabel.replace(/[,\s]/g, '').length;
            if (digitCount > 7) {
                btn.style.width = 'auto';
            } else if (digitCount > 5) {
                btn.style.fontSize = '9px';
            }
        } else if (!isNegativePrice) {
            // Add tooltip in normal mode
            this.addTooltip(btn, offset, isFixedModeEnabled);
        }

        return btn;
    }

    /**
     * Handle main button click - complex navigation flow
     * 1. Navigate back to order input page
     * 2. Wait for page load  
     * 3. Find or click limit button
     * 4. Set update flag
     * 5. Set the price
     */
    private async handleMainButtonClick(
        e: MouseEvent,
        isFixedMode: boolean
    ): Promise<void> {
        const tooltip = document.getElementById('zd-tooltip-el');
        if (tooltip) tooltip.style.display = 'none';
        (e.target as HTMLElement).blur();

        // Get price
        let price: string;
        if (this.controller && isFixedMode) {
            const buttonInfo = this.controller.getButtonDisplayInfo('single', 0);
            price = buttonInfo.price || '0';
        } else {
            const controls = document.querySelector('.zero-delay-confirm-controls');
            const currentPriceStr = controls?.getAttribute('data-current-price') || '0';
            price = currentPriceStr;
        }

        // Convert to English format
        price = price.replace(',', '.');

        // Navigate back and set price
        await this.navigateAndSetPrice(price);
    }

    /**
     * Handle offset button click - same navigation flow
     */
    private async handleOffsetButtonClick(
        e: MouseEvent,
        offset: number,
        isFixedMode: boolean,
        isFixedPriceMode: boolean
    ): Promise<void> {
        const btn = e.target as HTMLButtonElement;

        // Don't do anything if disabled
        if (btn.disabled) return;

        const tooltip = document.getElementById('zd-tooltip-el');
        if (tooltip) tooltip.style.display = 'none';
        btn.blur();

        // Get price
        let price: string;
        if (this.controller && isFixedPriceMode) {
            const buttonInfo = this.controller.getButtonDisplayInfo('single', offset);
            price = buttonInfo.price || '0';
        } else {
            // Calculate from current price
            const controls = document.querySelector('.zero-delay-confirm-controls');
            const currentPriceStr = controls?.getAttribute('data-current-price') || '0';
            const currentPrice = parseFloat(currentPriceStr);
            const decimals = Math.max(currentPriceStr.indexOf('.') >= 0 ? currentPriceStr.split('.')[1].length : 2, 4);

            const newPrice = isFixedMode
                ? currentPrice + offset
                : currentPrice * (1 + offset / 100);

            price = newPrice.toFixed(decimals);
        }

        // Convert to English format
        price = price.replace(',', '.');

        // Navigate back and set price
        await this.navigateAndSetPrice(price);
    }

    /**
     * Complex navigation flow to go back and set price
     * This is critical - it must:
     * 1. Click back button
     * 2. Wait for order input page
     * 3. Find limit input (or click limit button first)
     * 4. Set flag to prevent UI conflicts
     * 5. Set the price
     */
    private async navigateAndSetPrice(price: string): Promise<void> {
        const backButton = document.querySelector('a[data-zid="order-mask-back"]') as HTMLElement;
        if (!backButton) return;

        // Navigate back
        backButton.click();
        await this.waitForElement('trade-create-quote', 3000);

        // Find or create limit input
        let input = document.querySelector('input[data-zid="limit-order-input"]') as HTMLInputElement;

        if (!input) {
            // Click limit button to show input
            const limitButton = document.querySelector('div[data-zid="limit-order"]') as HTMLElement;
            if (limitButton) {
                limitButton.click();
                await this.waitForElement('input[data-zid="limit-order-input"]', 1000);
            }
        }

        // Set update flag to prevent UI state conflicts
        try {
            if ((window as any).chrome?.runtime?.id) {
                (window as any).chrome.storage.local.set({ 'zd_just_updated': true });
            }
        } catch (e) {
            console.warn('Zero Tools: Extension context invalidated. Please reload the page.');
        }

        // Set the price (always auto-check on Confirm page)
        this.target.setPrice(price, true);
    }

    /**
     * Wait for element to appear
     */
    private async waitForElement(selector: string, timeout: number): Promise<Element | null> {
        return new Promise((resolve) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(() => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    /**
     * Add tooltip to button with live price updates (same as OrderInputAdapter)
     */
    private addTooltip(
        btn: HTMLButtonElement,
        offset: number = 0,
        isFixedMode: boolean = false
    ): void {
        const updateTooltipContent = () => {
            const controls = btn.closest('.zero-delay-confirm-controls');
            if (!controls) return null;

            let basePrice = controls.getAttribute('data-current-price');
            if (!basePrice) return null;

            let finalPrice = basePrice;
            if (offset !== 0) {
                const base = parseFloat(basePrice);
                const decimals = Math.max(basePrice.indexOf('.') >= 0 ? basePrice.split('.')[1].length : 2, 4);

                let newPrice: number;
                if (isFixedMode) {
                    newPrice = base + offset;
                } else {
                    newPrice = base * (1 + offset / 100);
                }

                finalPrice = newPrice.toFixed(decimals);
            }

            return finalPrice;
        };

        const formatAndSetTooltip = (tooltip: HTMLElement, priceStr: string) => {
            const formattedPrice = priceStr.replace('.', ',');
            const parts = formattedPrice.split(',');
            if (parts.length === 2 && parts[1].length > 2) {
                const mainPart = parts[0];
                const firstTwoDecimals = parts[1].substring(0, 2);
                const extraDecimals = parts[1].substring(2);
                tooltip.innerHTML = `${mainPart},${firstTwoDecimals}<span style="opacity: 0.5;">${extraDecimals}</span>`;
            } else {
                tooltip.textContent = formattedPrice;
            }
        };

        btn.onmouseenter = () => {
            const priceStr = updateTooltipContent();
            if (!priceStr) return;

            let tooltip = document.getElementById('zd-tooltip-el');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'zd-tooltip-el';
                tooltip.className = 'zd-tooltip';
                document.body.appendChild(tooltip);
            }

            formatAndSetTooltip(tooltip, priceStr);
            tooltip.style.display = 'block';

            // Clear any existing interval and start new one
            const tooltipUpdateInterval = (window as any).tooltipUpdateInterval;
            if (tooltipUpdateInterval) clearInterval(tooltipUpdateInterval);
            (window as any).tooltipUpdateInterval = window.setInterval(() => {
                const currentPrice = updateTooltipContent();
                if (currentPrice && tooltip && tooltip.style.display !== 'none') {
                    formatAndSetTooltip(tooltip, currentPrice);
                }
            }, 100);
        };

        btn.onmousemove = (e) => {
            const tooltip = document.getElementById('zd-tooltip-el');
            if (tooltip) {
                tooltip.style.top = `${e.clientY - 45}px`;
                tooltip.style.left = `${e.clientX}px`;
            }
        };

        btn.onmouseleave = () => {
            const tooltip = document.getElementById('zd-tooltip-el');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
            const tooltipUpdateInterval = (window as any).tooltipUpdateInterval;
            if (tooltipUpdateInterval) {
                clearInterval(tooltipUpdateInterval);
                (window as any).tooltipUpdateInterval = null;
            }
        };
    }
}
