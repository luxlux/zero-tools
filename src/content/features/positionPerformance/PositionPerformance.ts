/**
 * Position Performance Feature
 * Displays performance of current position on the confirm page
 */

interface PositionSettings {
    confirmPageEnabled: boolean;
    confirmPagePerformanceInfoEnabled: boolean;
    latencyMonitorEnabled: boolean;
}

// Function to ensure the confirm page wrapper exists (for Order-Änderung and Performance-Info)
export const ensureConfirmPageWrapper = (settings: PositionSettings) => {
    // Only create wrapper if at least one feature is enabled
    if (!settings.confirmPageEnabled && !settings.confirmPagePerformanceInfoEnabled) {
        // Remove wrapper if it exists and no features are active
        document.querySelector('.zd-confirm-wrapper')?.remove();
        return null;
    }

    const confirmPage = document.querySelector('trade-confirm');
    if (!confirmPage) return null;

    // Check if wrapper already exists
    let wrapper = confirmPage.querySelector('.zd-confirm-wrapper') as HTMLElement;
    if (wrapper) return wrapper;

    // Find the reference point (controls container, performance container, or the upper div)
    let referenceElement = confirmPage.querySelector('.zero-delay-confirm-controls') as HTMLElement;

    if (!referenceElement) {
        // Try to find the performance price container
        referenceElement = confirmPage.querySelector('.zd-performance-price-container') as HTMLElement;
    }

    if (!referenceElement) {
        // Try to find the placeholder
        referenceElement = confirmPage.querySelector('.zero-delay-confirm-controls-placeholder') as HTMLElement;
    }

    if (!referenceElement) {
        // Fallback: find the upper div
        const upperDiv = confirmPage.querySelector('.d-flex.flex-column.zero-surface.grey-800.b-r-4.p-3.mt-3') as HTMLElement;
        if (!upperDiv) return null;

        // Create a placeholder for positioning
        referenceElement = document.createElement('div');
        referenceElement.className = 'zero-delay-confirm-controls-placeholder';
        referenceElement.style.display = 'none';
        upperDiv.insertAdjacentElement('afterend', referenceElement);
    }

    const parent = referenceElement.parentElement;
    if (!parent) return null;

    // Create the wrapper
    wrapper = document.createElement('div');
    wrapper.className = 'zd-confirm-wrapper';
    wrapper.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: start;
    width: 100%;
    margin-top: 16px;
    margin-bottom: 16px;
    padding: 12px;
    padding-bottom: 12px;
    border: 2px solid #3b82f6;
    border-radius: 12px;
    background-color: #eff6ff;
    position: relative;
  `;

    // Add disclaimer
    const disclaimer = document.createElement('div');
    disclaimer.style.cssText = `
    position: absolute;
    bottom: 3px;
    right: 8px;
    font-size: 8px;
    color: #6b7280;
    opacity: 0.6;
    line-height: 1;
  `;
    disclaimer.textContent = 'Hinzugefügt von zero tools Erweiterung. Angaben & Funktion ohne Gewähr!';
    wrapper.appendChild(disclaimer);

    // Insert wrapper - replace the reference element
    referenceElement.replaceWith(wrapper);

    return wrapper;
};

const fetchPositionData = async (isin: string): Promise<any | null> => {
    try {
        // Debug logging
        console.log('Zero Tools: Fetching position data for', isin);

        // Get customer ID from URL or API links
        // 1. Try current URL
        let customerId = window.location.pathname.match(/\/posteingang(?:\/(\d+))?/)?.[1];

        // 2. Try Postbox link in navigation (usually /posteingang/123456)
        if (!customerId) {
            const postboxLink = document.querySelector('a[href*="/posteingang/"]');
            if (postboxLink) {
                const href = postboxLink.getAttribute('href') || '';
                customerId = href.match(/\/posteingang\/(\d+)/)?.[1];
            }
        }

        // 3. Try API links (specifically the one user found: /api/posteingang/ID/doc/...)
        if (!customerId) {
            // First try in main document
            let apiLink = document.querySelector('a[href*="/api/posteingang/"]');

            // If not found, try within trade-confirm-links or trade-exante components
            if (!apiLink) {
                const tradeLinks = document.querySelector('trade-confirm-links');
                if (tradeLinks) {
                    apiLink = tradeLinks.querySelector('a[href*="/api/posteingang/"]');
                }
            }

            if (!apiLink) {
                const tradeExante = document.querySelector('trade-exante');
                if (tradeExante) {
                    apiLink = tradeExante.querySelector('a[href*="/api/posteingang/"]');
                }
            }

            if (apiLink) {
                const href = apiLink.getAttribute('href') || '';
                // Match /api/posteingang/1234567/
                const match = href.match(/\/api\/posteingang\/(\d+)\//);
                if (match) customerId = match[1];
            }
        }

        // 4. Try Cookie
        if (!customerId) {
            customerId = document.cookie.match(/customerId=(\d+)/)?.[1];
        }

        // 5. Fallback: Search for any link with a large number that looks like an ID
        if (!customerId) {
            // Look for links containing /depot/ or /dashboard/ which might have the ID
            const links = Array.from(document.querySelectorAll('a[href]'));
            for (const link of links) {
                const href = link.getAttribute('href') || '';
                const match = href.match(/\/(?:depot|dashboard|posteingang)\/(\d{6,})/);
                if (match) {
                    customerId = match[1];
                    break;
                }
            }
        }

        if (!customerId) {
            console.warn('Zero Tools: Customer ID not found on first try, retrying after delay...');
            // Retry after a delay (timing issue - page might still be loading)
            await new Promise(resolve => setTimeout(resolve, 500));

            // Try again
            const tradeLinks = document.querySelector('trade-confirm-links');
            if (tradeLinks) {
                const apiLink = tradeLinks.querySelector('a[href*="/api/posteingang/"]');
                if (apiLink) {
                    const href = apiLink.getAttribute('href') || '';
                    const match = href.match(/\/api\/posteingang\/(\d+)\//);
                    if (match) customerId = match[1];
                }
            }
        }

        if (!customerId) {
            console.warn('Zero Tools: Customer ID not found. Cannot fetch position data.');
            return null;
        }

        console.log('Zero Tools: Found Customer ID:', customerId);

        const apiUrl = `https://mein.finanzen-zero.net/api/trading/positions?customerId=${customerId}&withProtectionInfo=true`;
        const response = await fetch(apiUrl);
        if (!response.ok) {
            console.error('Zero Tools: API fetch failed', response.status);
            return null;
        }

        const data = await response.json();
        if (data && data.list) {
            const position = data.list.find((p: any) => p.isin === isin);
            console.log('Zero Tools: Position found:', position);
            return position || null;
        }
    } catch (e) {
        console.error('Zero Tools: Error fetching position data', e);
    }
    return null;
};

const injectPositionPerformance = async (controlsContainer: HTMLElement, isin: string, settings: PositionSettings) => {
    // Check if already injected
    if (controlsContainer.querySelector('.zd-position-info')) {
        return;
    }

    const position = await fetchPositionData(isin);

    if (!position) {

        // Check if it was a customer ID issue
        const customerId = await (async () => {
            // Quick check for customer ID
            let id = window.location.pathname.match(/\/posteingang(?:\/(\d+))?/)?.[1];
            if (!id) {
                const tradeLinks = document.querySelector('trade-confirm-links');
                if (tradeLinks) {
                    const apiLink = tradeLinks.querySelector('a[href*="/api/posteingang/"]');
                    if (apiLink) {
                        const href = apiLink.getAttribute('href') || '';
                        const match = href.match(/\/api\/posteingang\/(\d+)\//);
                        if (match) id = match[1];
                    }
                }
            }
            return id;
        })();

        // Show appropriate message
        const noPositionDiv = document.createElement('div');
        noPositionDiv.className = 'zd-position-info d-flex flex-column p-3 zero-surface grey-800 b-r-4 mt-3 mb-3';
        noPositionDiv.style.marginRight = 'auto';
        noPositionDiv.style.width = '100%';
        noPositionDiv.style.fontSize = '11px';
        noPositionDiv.style.border = '1px solid #e5e7eb';
        noPositionDiv.style.backgroundColor = '#fff3cd';

        if (!customerId) {
            noPositionDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <span class="font-bold" style="color: #856404;">Kunde nicht identifiziert</span>
        </div>
        <div style="color: #856404; font-size: 10px; margin-top: 4px;">Deine Kundennummer konnte nicht ermittelt werden. Position kann nicht geladen werden.</div>
      `;
        } else {
            noPositionDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
          <span class="font-bold" style="color: #856404;">Keine Position gefunden</span>
        </div>
        <div style="color: #856404; font-size: 10px; margin-top: 4px;">Du besitzt anscheinend derzeit keine Position dieses Wertpapiers.</div>
      `;
        }

        const parent = controlsContainer.parentElement;
        if (parent) {
            let wrapper = parent.querySelector('.zd-confirm-wrapper') as HTMLElement;
            if (!wrapper) {
                wrapper = document.createElement('div');
                wrapper.className = 'zd-confirm-wrapper d-flex justify-content-between align-items-start w-100 mt-3';
                controlsContainer.replaceWith(wrapper);
                wrapper.appendChild(noPositionDiv);
                wrapper.appendChild(controlsContainer);
                controlsContainer.classList.remove('mt-3');
                noPositionDiv.style.maxWidth = '45%';
                controlsContainer.style.maxWidth = '50%';
            } else {
                if (!wrapper.querySelector('.zd-position-info')) {
                    wrapper.insertBefore(noPositionDiv, wrapper.firstChild);
                }
            }
        }
        return;
    }



    // Create info container
    const infoDiv = document.createElement('div');
    infoDiv.className = 'zd-position-info d-flex flex-column p-3 zero-surface grey-800 b-r-4 mt-3 mb-3';
    infoDiv.style.marginRight = 'auto'; // Always position LEFT
    infoDiv.style.maxWidth = '48%'; // Fixed width
    infoDiv.style.fontSize = '11px';
    infoDiv.style.border = '1px solid #e5e7eb';
    infoDiv.style.backgroundColor = '#f9fafb';

    const quantity = position.quantity;
    const buyPrice = position.avgEntryQuote;

    // Format currency helper
    const fmt = (n: number) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) + ' €';

    // Function to update the display with current price
    const updateDisplay = () => {
        // Get current price from the page
        const currentPriceStr = controlsContainer.getAttribute('data-current-price');
        const currentPrice = currentPriceStr ? parseFloat(currentPriceStr) : position.quote;

        const buyValue = quantity * buyPrice;
        const currentValue = quantity * currentPrice;
        const diffValue = currentValue - buyValue;
        const diffPercent = (diffValue / buyValue) * 100;

        const isPositive = diffValue >= 0;
        const sign = isPositive ? '+' : '';
        const colorStyle = isPositive ? 'color: #059669;' : 'color: #dc2626;';

        // Get the latency that's already displayed on the page (if latency monitor is enabled)
        let latencyHtml = '';
        if (settings.latencyMonitorEnabled) {
            const confirmPage = document.querySelector('trade-confirm');
            if (confirmPage) {
                // Find the existing latency indicator that processTimestamps already created
                const latencyIndicator = confirmPage.querySelector('.latency-indicator');
                if (latencyIndicator) {
                    latencyHtml = `<span class="latency-indicator ${latencyIndicator.className.split(' ').slice(1).join(' ')}" style="font-size: 0.75em; padding: 0 4px; margin-right: 4px;">${latencyIndicator.textContent}</span>`;
                }
            }
        }

        infoDiv.innerHTML = `
      <div class="mb-2">
        <span class="font-bold">Meine Position (${quantity} Stk.)</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <div style="display: flex; justify-content: space-between; gap: 15px;">
          <span style="color: #64748b; font-size: 11px;">Einstandskurs:</span>
          <span class="font-medium">${fmt(buyPrice)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 15px;">
          <span style="color: #64748b; font-size: 11px;">Einstandswert:</span>
          <span class="font-medium">${fmt(buyValue)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 15px;">
          <span style="color: #64748b; font-size: 11px;">Aktueller Wert:</span>
          <span class="font-medium">${fmt(currentValue)}</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 15px;">
          <span style="color: #64748b; font-size: 11px;">Performance:</span>
          <span class="font-medium" style="${colorStyle}">${sign}${diffPercent.toFixed(2)} %</span>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 15px;">
          <span style="color: #64748b; font-size: 11px;">Entwicklung seit Kauf:</span>
          <span class="font-medium" style="${colorStyle}">
            ${latencyHtml} ${sign}${fmt(diffValue)}
          </span>
        </div>
      </div>
    `;
    };

    // Initial display
    updateDisplay();

    // Watch for price changes and update display
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-current-price') {
                updateDisplay();
            }
        }
    });

    observer.observe(controlsContainer, {
        attributes: true,
        attributeFilter: ['data-current-price']
    });

    // Ensure wrapper exists and insert infoDiv
    const wrapper = ensureConfirmPageWrapper(settings);

    if (wrapper) {
        // Style adjustments for better integration
        infoDiv.style.backgroundColor = 'white';
        infoDiv.style.border = '1px solid #d1d5db';

        // Only insert if not already there
        if (!wrapper.querySelector('.zd-position-info')) {
            wrapper.insertBefore(infoDiv, wrapper.firstChild);
        }
    }
};

// Separate function to inject performance info (independent of featureTwoEnabled)
export const injectConfirmPagePerformanceInfo = (settings: PositionSettings) => {
    if (!settings.confirmPagePerformanceInfoEnabled) return;

    const confirmPage = document.querySelector('trade-confirm');
    if (!confirmPage) return;

    // Find or create a container for price tracking
    let priceContainer = confirmPage.querySelector('.zero-delay-confirm-controls') as HTMLElement;

    // If Order-Änderung is disabled, we need our own container for price tracking
    if (!priceContainer) {
        priceContainer = confirmPage.querySelector('.zd-performance-price-container') as HTMLElement;

        if (!priceContainer) {
            // Create a hidden container just for tracking prices
            priceContainer = document.createElement('div');
            priceContainer.className = 'zd-performance-price-container';
            priceContainer.style.display = 'none';

            // Try multiple selectors to find a good insertion point
            let upperDiv = confirmPage.querySelector('.d-flex.flex-column.zero-surface.grey-800.b-r-4.p-3.mt-3') as HTMLElement;

            if (!upperDiv) {
                upperDiv = confirmPage.querySelector('trade-confirm-quote') as HTMLElement;
            }

            if (!upperDiv) {
                upperDiv = confirmPage.querySelector('.mt-3') as HTMLElement;
            }

            if (upperDiv) {
                upperDiv.insertAdjacentElement('afterend', priceContainer);
            } else {
                // Fallback: just append to confirmPage
                confirmPage.appendChild(priceContainer);
            }
        }
    }

    // Get ISIN from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const isin = urlParams.get('isin');

    if (isin) {
        // Only inject if not already there (CRITICAL: check BEFORE calling to avoid endless API calls)
        const wrapper = document.querySelector('.zd-confirm-wrapper');
        const alreadyInjected = wrapper?.querySelector('.zd-position-info') ||
            priceContainer.querySelector('.zd-position-info');

        if (!alreadyInjected) {
            injectPositionPerformance(priceContainer, isin, settings);
        }
    }
};
