/**
 * Button Factory - Unified button creation for all pages
 * Creates buttons with consistent styling and behavior
 */

import { PriceType } from './types';

export interface ButtonConfig {
    type: 'main' | 'offset';
    label: string;
    priceType?: PriceType;
    offset?: number;
    isAutoCheck?: boolean;
    isDisabled?: boolean;
    onClick: (e: MouseEvent) => void;
    className?: string;
}

export class ButtonFactory {
    /**
     * Create a button with unified styling and behavior
     */
    static createButton(config: ButtonConfig): HTMLButtonElement {
        const btn = document.createElement('button');

        // Set text content
        btn.textContent = config.label;

        // Base styling
        btn.className = config.className || 'zd-btn';
        btn.style.width = '100%';

        // Auto-check styling (blue button)
        if (config.isAutoCheck) {
            btn.classList.add('zd-btn-primary');
        }

        // Disabled state
        if (config.isDisabled) {
            btn.disabled = true;
            btn.style.opacity = '0.3';
        }

        // Click handler
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            btn.blur();
            config.onClick(e);
        };

        // Store metadata
        if (config.priceType) {
            btn.setAttribute('data-price-type', config.priceType);
        }
        if (config.offset !== undefined) {
            btn.setAttribute('data-offset', config.offset.toString());
        }
        btn.setAttribute('data-original-text', config.label);

        return btn;
    }

    /**
     * Format button label with faint 3rd+ decimal places
     */
    static formatButtonLabel(label: string): string {
        if (label.indexOf(',') === -1) return label;

        // Extract % symbol if present
        const hasPercent = label.endsWith('%');
        const numericPart = hasPercent ? label.slice(0, -1) : label;

        const parts = numericPart.split(',');
        if (parts[1] && parts[1].length > 2) {
            const mainDecimals = parts[1].substring(0, 2);
            const faintDecimals = parts[1].substring(2);
            const formatted = `${parts[0]},${mainDecimals}<span style="opacity: 0.5;">${faintDecimals}</span>`;
            return hasPercent ? formatted + '%' : formatted;
        }

        return label;
    }
}
