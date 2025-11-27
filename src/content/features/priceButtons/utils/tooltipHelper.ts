/**
 * Tooltip Helper - Shared tooltip logic for price buttons
 * Used by both OrderInputAdapter and ConfirmPageAdapter
 */

export interface TooltipConfig {
    /** CSS selector for container with price data */
    containerSelector: string;
    /** Attribute name to read base price from */
    priceAttribute: string;
    /** Offset to apply (0 for main button) */
    offset: number;
    /** Whether in fixed mode (add offset) or percentage mode (multiply) */
    isFixedMode: boolean;
}

/**
 * Attach tooltip handlers to a button
 */
export function attachTooltip(btn: HTMLButtonElement, config: TooltipConfig): void {
    const updateTooltipContent = () => {
        const controls = btn.closest(config.containerSelector);
        if (!controls) return null;

        let basePrice = controls.getAttribute(config.priceAttribute);
        if (!basePrice) return null;

        let finalPrice = basePrice;
        if (config.offset !== 0) {
            const base = parseFloat(basePrice);
            const decimals = Math.max(basePrice.indexOf('.') >= 0 ? basePrice.split('.')[1].length : 2, 4);

            let newPrice: number;
            if (config.isFixedMode) {
                newPrice = base + config.offset;
            } else {
                newPrice = base * (1 + config.offset / 100);
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
