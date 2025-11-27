/**
 * Latency Monitor Feature
 * Tracks and displays the latency of price quotes
 */

import { injectLimitButtons, injectLimitAdjuster, injectConfirmPageButtons, injectConfirmPagePerformanceInfo } from '../../index';

interface LatencySettings {
    isActive: boolean;
    latencyMonitorEnabled: boolean;
    warningThreshold: number;
    criticalThreshold: number;
}

export const parseTime = (timeStr: string): Date | null => {
    const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})/;
    const match = timeStr.match(timeRegex);

    if (!match) return null;

    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    date.setHours(parseInt(match[1], 10));
    date.setMinutes(parseInt(match[2], 10));
    date.setSeconds(parseInt(match[3], 10));

    if (date.getTime() > now.getTime() + 60000) {
        date.setDate(date.getDate() - 1);
    }

    return date;
};

export const updatePerformanceIndicator = (latencyData: { stateClass: string, displayTime: string }) => {
    const primaryTextNodes = document.querySelectorAll('.text-color-primary');
    let targetLabel: Element | null = null;

    for (let i = 0; i < primaryTextNodes.length; i++) {
        if (primaryTextNodes[i].textContent?.includes('Wertentwicklung seit Kauf')) {
            targetLabel = primaryTextNodes[i];
            break;
        }
    }

    if (!targetLabel || !targetLabel.parentElement) return;

    const valueContainer = targetLabel.parentElement.querySelector('.font-medium');

    if (valueContainer) {
        let indicator = valueContainer.querySelector('.latency-extra-indicator') as HTMLElement;

        if (!indicator) {
            indicator = document.createElement('span');
            indicator.className = 'latency-indicator latency-extra-indicator';
            indicator.style.marginLeft = '10px';
            valueContainer.appendChild(indicator);
        }

        indicator.classList.remove('latency-good', 'latency-warning', 'latency-critical');
        indicator.classList.add(latencyData.stateClass);
        indicator.innerText = latencyData.displayTime;
    }
};

export const removeAllIndicators = () => {
    document.querySelectorAll('.latency-indicator').forEach((el) => el.remove());
};

export const processTimestamps = (settings: LatencySettings) => {
    if (!settings.isActive) {
        removeAllIndicators();
        return;
    }

    if (settings.latencyMonitorEnabled) {
        let timeNodes: Element[] = Array.from(document.querySelectorAll('span[data-zid="quote-time"]'));

        if (timeNodes.length === 0) {
            // Fallback 1: Look for div.zero-text.label containing time (New structure)
            document.querySelectorAll('div.zero-text.label').forEach(div => {
                if (div.textContent?.match(/\d{1,2}:\d{2}:\d{2}/)) {
                    timeNodes.push(div);
                }
            });

            // Fallback 2: Look for elements inside .has-clock-icon (Old fallback)
            if (timeNodes.length === 0) {
                document.querySelectorAll('.has-clock-icon span').forEach(span => {
                    if (span.textContent?.match(/\d{1,2}:\d{2}:\d{2}/)) {
                        timeNodes.push(span);
                    }
                });
            }

            // Fallback 3: Specific check for Confirm Page (trade-confirm)
            // Look for ANY element with time pattern in the header area
            if (timeNodes.length === 0 && document.querySelector('trade-confirm')) {
                const confirmHeader = document.querySelector('trade-confirm .d-flex.justify-content-between.upper');
                if (confirmHeader) {
                    // Search within the header first
                    const walker = document.createTreeWalker(confirmHeader, NodeFilter.SHOW_TEXT);
                    let node;
                    while (node = walker.nextNode()) {
                        if (node.textContent?.match(/^\s*\d{1,2}:\d{2}:\d{2}\s*$/)) {
                            if (node.parentElement) timeNodes.push(node.parentElement);
                        }
                    }
                }

                // If still not found, search broadly in trade-confirm
                if (timeNodes.length === 0) {
                    document.querySelectorAll('trade-confirm *').forEach(el => {
                        // Avoid matching the latency indicator itself if it exists
                        if (el.classList.contains('latency-indicator')) return;

                        // Check direct text content only (not children)
                        const text = Array.from(el.childNodes)
                            .filter(n => n.nodeType === Node.TEXT_NODE)
                            .map(n => n.textContent)
                            .join('');

                        if (text.match(/^\s*\d{1,2}:\d{2}:\d{2}\s*$/)) {
                            timeNodes.push(el);
                        }
                    });
                }
            }
        }

        timeNodes.forEach((node) => {
            const timeStr = node.textContent?.trim();
            if (!timeStr) return;

            const quoteDate = parseTime(timeStr);
            if (!quoteDate) return;

            const now = new Date();
            const diffMs = now.getTime() - quoteDate.getTime();
            const diffSec = Math.floor(diffMs / 1000);

            let stateClass = 'latency-good';
            if (diffSec >= settings.criticalThreshold) {
                stateClass = 'latency-critical';
            } else if (diffSec >= settings.warningThreshold) {
                stateClass = 'latency-warning';
            }

            const displayTime = diffSec > 60
                ? `${Math.floor(diffSec / 60)}m ${diffSec % 60}s`
                : `${diffSec}s`;

            let indicator = node.querySelector('.latency-indicator') as HTMLElement;
            if (!indicator) {
                indicator = document.createElement('span');
                indicator.className = 'latency-indicator';
                // Append INSIDE the node to ensure it stays on the same line if the node is a block
                node.appendChild(indicator);
            }

            indicator.classList.remove('latency-good', 'latency-warning', 'latency-critical');
            indicator.classList.add(stateClass);
            indicator.innerText = `(${displayTime})`;

            // Only update performance indicator if this is the BID time
            // We check if the parent container has "Bid" text
            const isBid = node.parentElement?.textContent?.includes('Bid') ||
                node.parentElement?.parentElement?.textContent?.includes('Bid') ||
                // Also check specifically for the Bid column structure if possible
                (node.closest('.d-flex.flex-column') && node.closest('.d-flex.flex-column')?.textContent?.includes('Bid'));

            if (isBid) {
                updatePerformanceIndicator({ stateClass, displayTime: `(${displayTime})` });
            }
        });
    } else {
        removeAllIndicators();
    }

    // Call other injections
    injectLimitButtons();
    injectLimitAdjuster();
    injectConfirmPageButtons();
    injectConfirmPagePerformanceInfo();
};
