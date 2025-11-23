import { Clock, Activity, Zap, Info } from 'lucide-react';

declare const chrome: any;

interface Settings {
  isActive: boolean;
  latencyMonitorEnabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  featureTwoEnabled: boolean;
  autoCheckEnabled: boolean;
  offsetButtonsEnabled: boolean;
  customOffsets: string;
  limitAdjusterEnabled: boolean;
  confirmPageEnabled: boolean;
  postboxDownloaderEnabled: boolean;
  postboxFilenameMode: 'original' | 'display';
}

let settings: Settings = {
  isActive: true,
  latencyMonitorEnabled: true,
  warningThreshold: 5,
  criticalThreshold: 20,
  featureTwoEnabled: false,
  autoCheckEnabled: false,
  offsetButtonsEnabled: false,
  customOffsets: '0,1%; 0,2%; 0,5%; 1,0%',
  limitAdjusterEnabled: false,
  confirmPageEnabled: false,
  postboxDownloaderEnabled: true,
  postboxFilenameMode: 'display',
};

// Load settings on startup
if (typeof chrome !== 'undefined' && chrome.storage) {
  chrome.storage.sync.get(['latencySettings'], (result: any) => {
    if (result.latencySettings) {
      const loaded = result.latencySettings;
      if (typeof loaded.isActive !== 'undefined' && typeof loaded.latencyMonitorEnabled === 'undefined') {
        loaded.latencyMonitorEnabled = loaded.isActive;
      }
      settings = { ...settings, ...loaded };
    }
  });

  chrome.storage.onChanged.addListener((changes: any, namespace: string) => {
    if (namespace === 'sync' && changes.latencySettings) {
      settings = changes.latencySettings.newValue;
      updateUIState();
      processTimestamps();
    }
  });
}

// --- Helper Functions ---

const parseTime = (timeStr: string): Date | null => {
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

const updatePerformanceIndicator = (latencyData: { stateClass: string, displayTime: string }) => {
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

const removeAllIndicators = () => {
  document.querySelectorAll('.latency-indicator').forEach((el) => el.remove());
};

const injectStyles = () => {
  let style = document.getElementById('zero-delay-styles') as HTMLStyleElement;
  if (!style) {
    style = document.createElement('style');
    style.id = 'zero-delay-styles';
    document.head.appendChild(style);
  }

  style.textContent = `
    .zd-btn {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #ced4da;
      cursor: pointer;
      font-weight: 500;
      line-height: 1.4;
      transition: all 0.2s;
      background-color: #fff;
      color: #495057;
    }
    .zd-btn:hover {
      background-color: #e9ecef;
      border-color: #adb5bd;
    }
    .zd-btn-primary {
      border-color: #248eff;
      background-color: #248eff;
      color: #fff;
    }
    .zd-btn-primary:hover {
      background-color: #1a75d6;
      border-color: #1a75d6;
    }
    .zd-offset-btn {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
      min-width: 35px;
      text-align: center;
      line-height: 1.2;
    }
    .zd-group-col {
      display: flex;
      flex-direction: column;
      gap: 2px;
      align-items: stretch;
    }
    .zd-offsets-row {
      display: flex;
      gap: 2px;
      justify-content: space-between;
    }
    .zd-offsets-row .zd-btn {
      flex: 1;
    }
    .zd-price-group {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .zd-price-group > .zd-btn {
      margin: 2px 0;
    }
    .zd-separator {
      color: #6c757d;
      font-weight: bold;
      font-size: 12px;
      align-self: center;
      margin: 0 4px;
    }
    .zd-limit-adjuster {
      display: flex;
      justify-content: flex-start;
      gap: 4px;
    }
    .latency-indicator {
      font-size: 0.75em;
      font-weight: bold;
      padding: 2px 4px;
      border-radius: 3px;
      margin-left: 5px;
      white-space: nowrap;
    }
    .latency-good {
      color: #198754;
      background-color: #d1e7dd;
    }
    .latency-warning {
      color: #ffc107;
      background-color: #fff3cd;
    }
    .latency-critical {
      color: #dc3545;
      background-color: #f8d7da;
    }
    .zd-tooltip {
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
      z-index: 10000;
      white-space: nowrap;
      transform: translateX(-50%);
    }
    @keyframes zd-highlight-fade {
      0% { background-color: rgba(255, 255, 0, 0.5); }
      100% { background-color: transparent; }
    }
    .zd-highlight-anim {
      animation: zd-highlight-fade 2.5s ease-out forwards;
      border-radius: 4px;
    }
  `;
};

const checkAndHighlightFields = () => {
  chrome.storage.local.get(['zd_just_updated'], (result) => {
    if (result.zd_just_updated) {
      // Clear the flag
      chrome.storage.local.remove('zd_just_updated');

      const confirmData = document.querySelector('trade-confirm-data');
      if (!confirmData) return;

      const rows = Array.from(confirmData.querySelectorAll('.d-flex.justify-content-between'));

      // Highlight Order Type
      const orderTypeRow = rows.find(row => row.querySelector('div')?.textContent?.trim() === 'Orderart');
      const orderTypeVal = orderTypeRow?.querySelector('.font-bold');
      if (orderTypeVal) {
        orderTypeVal.classList.add('zd-highlight-anim');
      }

      // Highlight Price (Limitpreis)
      const priceRow = rows.find(row => row.querySelector('div')?.textContent?.trim() === 'Limitpreis');
      const priceVal = priceRow?.querySelector('.font-bold');
      if (priceVal) {
        priceVal.classList.add('zd-highlight-anim');
      }
    }
  });
};

let lastState = {
  bid: '',
  ask: '',
  single: '',
  autoCheck: false,
  offsetEnabled: false,
  offsets: ''
};

let isShiftHeld = false;

const updateUIState = () => {
  // Skip shift logic on confirm page
  const isConfirmPage = !!document.querySelector('trade-confirm');
  const isCheckMode = isConfirmPage ? false : (settings.autoCheckEnabled || isShiftHeld);

  // Update main buttons
  document.querySelectorAll('.zd-btn').forEach(btn => {
    if (btn.classList.contains('zd-offset-btn') && btn.parentElement?.classList.contains('zd-limit-adjuster')) return;
    // Skip confirm page buttons
    if (btn.closest('.zero-delay-confirm-controls')) return;

    const originalText = btn.getAttribute('data-original-text') || btn.textContent?.replace(' & Prüfen', '') || '';
    if (!btn.getAttribute('data-original-text')) {
      btn.setAttribute('data-original-text', originalText);
    }

    if (isCheckMode) {
      btn.classList.add('zd-btn-primary');
      if (!btn.textContent?.includes('& Prüfen') && !btn.classList.contains('zd-offset-btn')) {
        btn.textContent = `${originalText} & Prüfen`;
      }
    } else {
      btn.classList.remove('zd-btn-primary');
      if (!btn.classList.contains('zd-offset-btn')) {
        btn.textContent = originalText;
      }
    }
  });

  // Update Limit Adjuster visibility (not on confirm page)
  if (!isConfirmPage) {
    const adjusters = document.querySelectorAll('.zd-limit-adjuster');
    adjusters.forEach(el => {
      (el as HTMLElement).style.display = isCheckMode ? 'none' : 'flex';
    });
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Shift' && !isShiftHeld) {
    isShiftHeld = true;
    updateUIState();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    isShiftHeld = false;
    updateUIState();
  }
});

const setLimitValue = (priceStr: string, autoCheck: boolean) => {
  const limitButton = document.querySelector('div[data-zid="limit-order"]') as HTMLElement;
  const limitInputSelector = 'input[data-zid="limit-order-input"]';

  if (!limitButton) {
    console.warn('ZeroDelay: Limit button not found');
    return;
  }

  let input = document.querySelector(limitInputSelector) as HTMLInputElement;

  if (!input) {
    limitButton.click();
  }

  let attempts = 0;
  const maxAttempts = 20;

  const interval = setInterval(() => {
    attempts++;
    input = document.querySelector(limitInputSelector) as HTMLInputElement;

    if (input) {
      clearInterval(interval);

      input.value = priceStr;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));

      if (autoCheck) {
        // Wait for check button to be enabled/ready
        setTimeout(() => {
          const checkButton = document.querySelector('web-design-system-button[data-zid="check-order"] button') as HTMLElement;
          if (checkButton) {
            // Set flag for highlighting on next page
            chrome.storage.local.set({ 'zd_just_updated': true });
            checkButton.click();
          } else {
            console.warn('ZeroDelay: Check Order button not found');
          }
        }, 100);
      }

    } else if (attempts >= maxAttempts) {
      clearInterval(interval);
      console.warn('ZeroDelay: Limit input did not appear');
    }
  }, 50);
};

// --- Main Feature Functions ---

const injectLimitAdjuster = () => {
  if (!settings.limitAdjusterEnabled) {
    document.querySelectorAll('.zd-limit-adjuster').forEach(el => el.remove());
    return;
  }

  const input = document.querySelector('input[data-zid="limit-order-input"]') as HTMLInputElement;
  if (!input) return;

  // Check if already exists
  if (input.parentElement?.querySelector('.zd-limit-adjuster')) {
    // Just update visibility in case it was hidden/shown incorrectly
    updateUIState();
    return;
  }

  const createRow = (values: number[], isPositive: boolean) => {
    const row = document.createElement('div');
    row.className = 'zd-limit-adjuster';
    row.style.marginBottom = isPositive ? '4px' : '0';
    row.style.marginTop = isPositive ? '0' : '4px';

    values.forEach(val => {
      const btn = document.createElement('button');
      const sign = isPositive ? '+' : '-';
      btn.textContent = `${sign}${val.toString().replace('.', ',')}`;
      btn.className = 'zd-btn zd-offset-btn';
      btn.style.minWidth = '30px';

      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        let currentValStr = input.value.replace(',', '.');
        let currentVal = parseFloat(currentValStr);
        if (isNaN(currentVal)) currentVal = 0;

        const adjustment = isPositive ? val : -val;
        let newVal = currentVal + adjustment;
        if (newVal < 0) newVal = 0;

        const currentDecimals = currentValStr.includes('.') ? currentValStr.split('.')[1].length : 2;
        const valDecimals = val.toString().split('.')[1]?.length || 0;
        const finalDecimals = Math.max(currentDecimals, valDecimals);

        input.value = newVal.toFixed(finalDecimals);

        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      };
      row.appendChild(btn);
    });
    return row;
  };

  const values = [10, 1, 0.1, 0.01, 0.001];

  const topRow = createRow(values, true);
  input.insertAdjacentElement('beforebegin', topRow);

  const bottomRow = createRow(values, false);
  input.insertAdjacentElement('afterend', bottomRow);
};

// Helper to wait for element to appear in DOM
const waitForElement = (selector: string, timeout: number): Promise<Element | null> => {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
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
};

const injectLimitButtons = () => {
  injectStyles();

  const container = document.querySelector('trade-create-quote') || document.querySelector('div[data-zid="quote-container"]');
  if (!container) return;

  if (!settings.featureTwoEnabled) {
    container.querySelector('.zero-delay-limit-controls')?.remove();
    return;
  }

  const limitButton = document.querySelector('div[data-zid="limit-order"]');
  if (!limitButton) {
    container.querySelector('.zero-delay-limit-controls')?.remove();
    return;
  }

  const bidNode = container.querySelector('span[data-zid="quote-spread"]');
  const askNode = container.querySelector('.quoteindicator');
  const singleNode = container.querySelector('span[data-zid="quote-sell"]') || container.querySelector('span[data-zid="quote-buy"]');

  if ((!bidNode || !askNode) && !singleNode) return;

  const extractPrice = (text: string): string | null => {
    const match = text.match(/([\d,]+)/);
    if (!match) return null;
    return match[1].replace(',', '.');
  };

  let bidPriceStr: string | null = null;
  let askPriceStr: string | null = null;
  let singlePriceStr: string | null = null;

  if (bidNode && askNode) {
    bidPriceStr = extractPrice(bidNode.textContent || '');
    askPriceStr = extractPrice(askNode.textContent || '');
  } else if (singleNode) {
    singlePriceStr = extractPrice(singleNode.textContent || '');
  }

  const currentState = {
    bid: bidPriceStr || '',
    ask: askPriceStr || '',
    single: singlePriceStr || '',
    autoCheck: settings.autoCheckEnabled,
    offsetEnabled: settings.offsetButtonsEnabled,
    offsets: settings.customOffsets
  };

  if (
    currentState.bid === lastState.bid &&
    currentState.ask === lastState.ask &&
    currentState.single === lastState.single &&
    currentState.autoCheck === lastState.autoCheck &&
    currentState.offsetEnabled === lastState.offsetEnabled &&
    currentState.offsets === lastState.offsets &&
    container.querySelector('.zero-delay-limit-controls')
  ) {
    return;
  }

  lastState = currentState;

  // Cleanup old containers if they exist
  container.querySelector('.zero-delay-offset-controls')?.remove();

  let controls = container.querySelector('.zero-delay-limit-controls') as HTMLElement;
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'zero-delay-limit-controls d-flex justify-content-end align-items-start mt-0 mb-2';
    controls.style.gap = '8px';

    const quoteContainer = container.querySelector('div[data-zid="quote-container"]');
    if (quoteContainer) {
      quoteContainer.insertAdjacentElement('afterend', controls);
    } else {
      container.appendChild(controls);
    }
  } else {
    controls.innerHTML = '';
    controls.className = 'zero-delay-limit-controls d-flex justify-content-end align-items-start mt-0 mb-2';
    controls.style.gap = '8px';
  }

  const isAutoCheck = settings.autoCheckEnabled;
  let originalValue = '';

  const handleTooltip = (btn: HTMLButtonElement, priceStr: string) => {
    btn.onmouseenter = () => {
      let tooltip = document.getElementById('zd-tooltip-el');
      if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'zd-tooltip-el';
        tooltip.className = 'zd-tooltip';
        document.body.appendChild(tooltip);
      }

      // Format price with dimmed extra decimals
      const formattedPrice = priceStr.replace('.', ',');
      const parts = formattedPrice.split(',');

      if (parts.length === 2 && parts[1].length > 2) {
        // Has more than 2 decimal places - dim the extras
        const mainPart = parts[0];
        const firstTwoDecimals = parts[1].substring(0, 2);
        const extraDecimals = parts[1].substring(2);
        tooltip.innerHTML = `${mainPart},${firstTwoDecimals}<span style="opacity: 0.5;">${extraDecimals}</span>`;
      } else {
        tooltip.textContent = formattedPrice;
      }

      tooltip.style.display = 'block';
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
    };
  };

  const createBtn = (label: string, priceStr: string) => {
    const btn = document.createElement('button');
    btn.setAttribute('data-original-text', label);

    // Initial state
    if (isAutoCheck || isShiftHeld) {
      btn.textContent = `${label} & Prüfen`;
      btn.classList.add('zd-btn-primary');
    } else {
      btn.textContent = label;
    }

    btn.className = 'zd-btn';
    btn.style.width = '100%';

    handleTooltip(btn, priceStr);

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const tooltip = document.getElementById('zd-tooltip-el');
      if (tooltip) tooltip.style.display = 'none';

      btn.blur(); // Remove focus outline

      setLimitValue(priceStr, isAutoCheck || e.shiftKey);
    };
    return btn;
  };

  const getDecimals = (str: string) => {
    if (str.indexOf('.') < 0) return 2;
    return str.split('.')[1].length;
  };

  const createOffsetBtn = (basePriceStr: string, offset: number, isPositive: boolean) => {
    const basePrice = parseFloat(basePriceStr);
    const decimals = getDecimals(basePriceStr);
    const finalOffset = isPositive ? offset : -offset;
    const newPrice = basePrice * (1 + finalOffset / 100);
    const newPriceStr = newPrice.toFixed(decimals);

    const sign = isPositive ? '+' : '-';
    const label = `${sign}${offset.toString().replace('.', ',')}%`;

    const btn = document.createElement('button');
    btn.setAttribute('data-original-text', label);

    // Initial state
    if (isAutoCheck || isShiftHeld) {
      btn.classList.add('zd-btn-primary');
    }
    btn.textContent = label; // Offset buttons usually don't change text to "& Prüfen" due to space, but color changes

    btn.className = 'zd-btn zd-offset-btn';

    handleTooltip(btn, newPriceStr);

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const tooltip = document.getElementById('zd-tooltip-el');
      if (tooltip) tooltip.style.display = 'none';

      btn.blur(); // Remove focus outline

      setLimitValue(newPriceStr, isAutoCheck || e.shiftKey);
    };
    return btn;
  };

  const createPriceGroup = (label: string, priceStr: string) => {
    const group = document.createElement('div');
    group.className = 'zd-group-col';

    let offsets: number[] = [];
    if (settings.offsetButtonsEnabled && settings.customOffsets) {
      offsets = settings.customOffsets.split(';')
        .map(s => parseFloat(s.trim().replace(',', '.')))
        .filter(n => !isNaN(n));
      offsets = Array.from(new Set(offsets.map(Math.abs))).sort((a, b) => a - b);
    }

    // Top Row (Positive)
    if (offsets.length > 0) {
      const row = document.createElement('div');
      row.className = 'zd-offsets-row';
      offsets.forEach(off => {
        row.appendChild(createOffsetBtn(priceStr, off, true));
      });
      group.appendChild(row);
    }

    // Main Button
    group.appendChild(createBtn(label, priceStr));

    // Bottom Row (Negative)
    if (offsets.length > 0) {
      const row = document.createElement('div');
      row.className = 'zd-offsets-row';
      offsets.forEach(off => {
        row.appendChild(createOffsetBtn(priceStr, off, false));
      });
      group.appendChild(row);
    }

    return group;
  };

  if (bidPriceStr && askPriceStr) {
    const hasBid = !isNaN(parseFloat(bidPriceStr));
    const hasAsk = !isNaN(parseFloat(askPriceStr));

    if (hasBid) {
      controls.appendChild(createPriceGroup('Bid als Limit', bidPriceStr));
    }

    if (hasBid && hasAsk) {
      const separator = document.createElement('div');
      separator.textContent = '/';
      separator.className = 'zd-separator';
      controls.appendChild(separator);
    }

    if (hasAsk) {
      controls.appendChild(createPriceGroup('Ask als Limit', askPriceStr));
    }
  } else if (singlePriceStr) {
    const hasPrice = !isNaN(parseFloat(singlePriceStr));
    if (hasPrice) {
      controls.appendChild(createPriceGroup('Kurs als Limit', singlePriceStr));
    }
  }

  // Update UI state to ensure correct initial styling
  updateUIState();
};

const injectConfirmPageButtons = () => {
  const confirmPage = document.querySelector('trade-confirm');
  if (!confirmPage || !settings.confirmPageEnabled) {
    document.querySelector('.zero-delay-confirm-controls')?.remove();
    return;
  }

  // Ensure styles are injected
  injectStyles();

  // Extract order type and direction
  const confirmData = confirmPage.querySelector('trade-confirm-data');
  if (!confirmData) return;

  // Find Order Type (e.g., "Limit", "Markt", "Stop Market")
  // We look for the row containing "Orderart" and get the value in the second column
  const rows = Array.from(confirmData.querySelectorAll('.d-flex.justify-content-between'));

  const orderTypeRow = rows.find(row => row.querySelector('div')?.textContent?.trim() === 'Orderart');
  const orderType = orderTypeRow?.querySelector('.font-bold')?.textContent?.trim() || '';

  const isLimitOrder = orderType === 'Limit';
  const isNotMarketOrder = orderType !== 'Markt' && orderType !== '';

  const directionRow = rows.find(row => row.querySelector('div')?.textContent?.trim() === 'Kauf / Verkauf');
  const direction = directionRow?.querySelector('.font-bold')?.textContent?.trim() || '';
  const isBuy = direction === 'Kauf';

  // Find quote element and extract prices
  const upperDiv = confirmPage.querySelector('.d-flex.justify-content-between.upper');
  if (!upperDiv) return;

  const quoteIndicator = upperDiv.querySelector('.quoteindicator');
  if (!quoteIndicator) return;

  const quoteText = quoteIndicator.textContent?.trim() || '';

  // Parse prices - format: "17,560 € / 17,550 €" or just "17,550 €"
  const prices = quoteText.split('/').map(p => p.trim().replace('€', '').trim());
  let currentPrice = '';

  if (prices.length === 2) {
    // Bid / Ask format
    currentPrice = isBuy ? prices[1] : prices[0]; // Ask for buy, Bid for sell
  } else {
    // Single price
    currentPrice = prices[0];
  }

  if (!currentPrice) return;

  // Convert comma to dot for calculations
  const priceStr = currentPrice.replace(',', '.');

  // Check if we already injected buttons
  let controls = confirmPage.querySelector('.zero-delay-confirm-controls') as HTMLElement;
  if (controls) return; // Already injected

  // Create container
  controls = document.createElement('div');
  controls.className = 'zero-delay-confirm-controls d-flex flex-column align-items-end mt-3 mb-3';
  controls.style.gap = '8px';

  // Header
  const header = document.createElement('div');
  header.className = 'font-bold';
  header.textContent = isLimitOrder ? 'Limit ändern:' : 'Zu Limit Order wechseln:';
  controls.appendChild(header);

  // Create price group container
  const group = document.createElement('div');
  group.className = 'zd-price-group';

  const basePrice = parseFloat(priceStr);
  const decimals = priceStr.indexOf('.') >= 0 ? priceStr.split('.')[1].length : 2;

  // Offset buttons
  if (settings.offsetButtonsEnabled) {
    const offsets = settings.customOffsets.split(';')
      .map(s => parseFloat(s.trim().replace(',', '.')))
      .filter(n => !isNaN(n));
    const uniqueOffsets = Array.from(new Set(offsets.map(Math.abs))).sort((a, b) => a - b);

    // Top Row (Positive offsets)
    if (uniqueOffsets.length > 0) {
      const topRow = document.createElement('div');
      topRow.className = 'zd-offsets-row';

      uniqueOffsets.forEach(offset => {
        const newPrice = basePrice * (1 + offset / 100);
        const newPriceStr = newPrice.toFixed(decimals);
        const label = `+${offset.toString().replace('.', ',')}%`;
        topRow.appendChild(createConfirmOffsetBtn(label, newPriceStr));
      });

      group.appendChild(topRow);
    }
  }

  // Main Button
  // Dynamic label based on direction
  const mainButtonLabel = isBuy ? 'Ask als Limit' : 'Bid als Limit';
  group.appendChild(createConfirmBtn(mainButtonLabel, priceStr));

  // Offset buttons
  if (settings.offsetButtonsEnabled) {
    const offsets = settings.customOffsets.split(';')
      .map(s => parseFloat(s.trim().replace(',', '.')))
      .filter(n => !isNaN(n));
    const uniqueOffsets = Array.from(new Set(offsets.map(Math.abs))).sort((a, b) => a - b);

    // Bottom Row (Negative offsets)
    if (uniqueOffsets.length > 0) {
      const bottomRow = document.createElement('div');
      bottomRow.className = 'zd-offsets-row';

      uniqueOffsets.forEach(offset => {
        const newPrice = basePrice * (1 - offset / 100);
        const newPriceStr = newPrice.toFixed(decimals);
        const label = `-${offset.toString().replace('.', ',')}%`;
        bottomRow.appendChild(createConfirmOffsetBtn(label, newPriceStr));
      });

      group.appendChild(bottomRow);
    }
  }

  // Market order button (for all non-market orders) - INSIDE the group
  if (isNotMarketOrder) {
    const marketBtn = document.createElement('button');
    marketBtn.textContent = 'Auf Market Order wechseln';
    marketBtn.className = 'zd-btn mt-2';
    marketBtn.style.backgroundColor = '#dc3545';
    marketBtn.style.borderColor = '#dc3545';
    marketBtn.style.color = '#fff';
    marketBtn.style.width = '100%';

    marketBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      marketBtn.blur();

      // Set flag for highlighting
      chrome.storage.local.set({ 'zd_just_updated': true });

      const backButton = document.querySelector('a[data-zid="order-mask-back"]') as HTMLElement;
      if (!backButton) return;

      backButton.click();
      await waitForElement('trade-create-quote', 3000);

      // Start with shorter wait, retry if needed with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 100));

      let retryCount = 0;
      const maxRetries = 3;
      const retryDelays = [200, 400, 800]; // Exponential backoff for retries 2, 3, 4

      const attemptClose = () => {
        // Close all open order options
        const optionButtons = document.querySelectorAll('[data-zid="options-container"] [data-zid$="-order"]');
        optionButtons.forEach(btn => {
          const useElement = btn.querySelector('use');
          if (useElement) {
            const href = useElement.getAttribute('xlink:href') || '';
            if (href.includes('#minus')) {
              (btn as HTMLElement).click();
            }
          }
        });
      };

      // Initial attempt
      attemptClose();

      // Poll for limit input to disappear
      let pollAttempts = 0;
      const maxPollAttempts = 15;

      const checkInterval = setInterval(() => {
        pollAttempts++;
        const limitInput = document.querySelector('input[data-zid="limit-order-input"]');

        if (!limitInput) {
          // Success! Limit input is closed
          clearInterval(checkInterval);

          const checkButton = document.querySelector('web-design-system-button[data-zid="check-order"] button') as HTMLElement;
          if (checkButton) {
            checkButton.click();
          }
        } else if (pollAttempts >= maxPollAttempts) {
          // Timeout - check if we can retry
          if (retryCount < maxRetries) {
            const delay = retryDelays[retryCount];
            retryCount++;
            pollAttempts = 0;

            // Wait with exponential backoff before retry
            setTimeout(() => {
              attemptClose();
            }, delay);
          } else {
            // Failed after all retries - abort
            clearInterval(checkInterval);
            alert('Fehler: Automatischer Wechsel zur Vorbereitung einer Market Order fehlgeschlagen.\n\nBitte setzen Sie die Order manuell mit den richtigen Einstellungen fort.');
          }
        }
      }, 100);
    };

    group.appendChild(marketBtn);
  }

  controls.appendChild(group);

  // Insert after the quote element
  upperDiv.insertAdjacentElement('afterend', controls);

  // Trigger highlighting check
  checkAndHighlightFields();
};

// Helper functions for confirm page buttons
const createConfirmBtn = (label: string, price: string) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = 'zd-btn zd-btn-primary';
  btn.style.width = '100%';

  // Add tooltip
  addTooltipToButton(btn, price);

  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const tooltip = document.getElementById('zd-tooltip-el');
    if (tooltip) tooltip.style.display = 'none';
    btn.blur();

    const backButton = document.querySelector('a[data-zid="order-mask-back"]') as HTMLElement;
    if (!backButton) return;

    backButton.click();
    await waitForElement('trade-create-quote', 3000);

    let input = document.querySelector('input[data-zid="limit-order-input"]') as HTMLInputElement;

    if (!input) {
      const limitButton = document.querySelector('div[data-zid="limit-order"]') as HTMLElement;
      if (limitButton) {
        limitButton.click();
        await waitForElement('input[data-zid="limit-order-input"]', 1000);
      }
    }

    // Set flag for highlighting
    chrome.storage.local.set({ 'zd_just_updated': true });
    setLimitValue(price, true);
  };

  return btn;
};

const createConfirmOffsetBtn = (label: string, price: string) => {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.className = 'zd-btn zd-offset-btn zd-btn-primary';

  // Add tooltip
  addTooltipToButton(btn, price);

  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const tooltip = document.getElementById('zd-tooltip-el');
    if (tooltip) tooltip.style.display = 'none';
    btn.blur();

    const backButton = document.querySelector('a[data-zid="order-mask-back"]') as HTMLElement;
    if (!backButton) return;

    backButton.click();
    await waitForElement('trade-create-quote', 3000);

    let input = document.querySelector('input[data-zid="limit-order-input"]') as HTMLInputElement;

    if (!input) {
      const limitButton = document.querySelector('div[data-zid="limit-order"]') as HTMLElement;
      if (limitButton) {
        limitButton.click();
        await waitForElement('input[data-zid="limit-order-input"]', 1000);
      }
    }

    // Set flag for highlighting
    chrome.storage.local.set({ 'zd_just_updated': true });
    setLimitValue(price, true);
  };

  return btn;
};

const addTooltipToButton = (btn: HTMLButtonElement, price: string) => {
  btn.onmouseenter = () => {
    let tooltip = document.getElementById('zd-tooltip-el');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'zd-tooltip-el';
      tooltip.className = 'zd-tooltip';
      document.body.appendChild(tooltip);
    }

    const formattedPrice = price.replace('.', ',');
    const parts = formattedPrice.split(',');

    if (parts.length === 2 && parts[1].length > 2) {
      const mainPart = parts[0];
      const firstTwoDecimals = parts[1].substring(0, 2);
      const extraDecimals = parts[1].substring(2);
      tooltip.innerHTML = `${mainPart},${firstTwoDecimals}<span style="opacity: 0.5;">${extraDecimals}</span>`;
    } else {
      tooltip.textContent = formattedPrice;
    }

    tooltip.style.display = 'block';
  };

  btn.onmousemove = (e) => {
    const tooltip = document.getElementById('zd-tooltip-el');
    if (tooltip) {
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top = (e.clientY - 45) + 'px';
    }
  };

  btn.onmouseleave = () => {
    const tooltip = document.getElementById('zd-tooltip-el');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  };
};
const processTimestamps = () => {
  if (!settings.isActive) {
    removeAllIndicators();
    return;
  }

  if (settings.latencyMonitorEnabled) {
    const timeNodes = document.querySelectorAll('span[data-zid="quote-time"]');
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

      let indicator = node.parentElement?.querySelector('.latency-indicator') as HTMLElement;
      if (!indicator) {
        indicator = document.createElement('span');
        indicator.className = 'latency-indicator';
        indicator.style.marginLeft = '8px';
        node.parentElement?.appendChild(indicator);
      }

      indicator.classList.remove('latency-good', 'latency-warning', 'latency-critical');
      indicator.classList.add(stateClass);
      indicator.innerText = `(${displayTime})`;

      updatePerformanceIndicator({ stateClass, displayTime: `(${displayTime})` });
    });
  } else {
    removeAllIndicators();
  }

  injectLimitButtons();
  injectLimitAdjuster();
  injectConfirmPageButtons();
};

// Run every second
setInterval(processTimestamps, 1000);

// Run immediately on load
processTimestamps();
// ========== POSTBOX DOWNLOADER ====================
// Inlined to avoid ES6 module issues
declare const JSZip: any;

interface DocItem {
  id: string;
  title: string;
  date: string;
  url: string;
  isNew: boolean;
  element: HTMLElement;
}

const initPostboxDownloader = (enabled: boolean) => {
  if (!enabled) return;
  if (!window.location.href.includes('/posteingang')) return;

  setInterval(() => {
    const table = document.querySelector('table.table-post');
    const controls = document.getElementById('zd-postbox-controls');
    if (table && !controls) {
      const container = table.closest('.inbox');
      if (!container) return;

      const div = document.createElement('div');
      div.id = 'zd-postbox-controls';
      div.className = 'd-flex justify-content-end mb-2';
      div.style.cssText = 'gap:10px;padding:10px;background:#f8f9fa;border-radius:5px;border:1px solid #dee2e6';

      const btnAll = document.createElement('button');
      btnAll.textContent = 'Alle angezeigten laden (ZIP)';
      btnAll.style.cssText = 'padding:8px 16px;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s';
      btnAll.onmouseover = () => btnAll.style.background = '#c7d2fe';
      btnAll.onmouseout = () => btnAll.style.background = '#e0e7ff';
      btnAll.onclick = () => downloadDocs(false);

      const btnNew = document.createElement('button');
      btnNew.textContent = 'Nur UNGELESENE laden (ZIP)';
      btnNew.style.cssText = 'padding:8px 16px;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:6px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s';
      btnNew.onmouseover = () => btnNew.style.background = '#c7d2fe';
      btnNew.onmouseout = () => btnNew.style.background = '#e0e7ff';
      btnNew.onclick = () => downloadDocs(true);

      div.appendChild(btnAll);
      div.appendChild(btnNew);
      container.insertAdjacentElement('beforebegin', div);
    }
  }, 1000);
};

const downloadDocs = async (onlyNew: boolean) => {
  const rows = document.querySelectorAll('table.table-post tbody tr');
  const docs: DocItem[] = [];

  rows.forEach(row => {
    const linkEl = row.querySelector('a[href*="/doc/"]');
    if (!linkEl) return;
    const url = linkEl.getAttribute('href');
    if (!url) return;

    const title = linkEl.textContent?.trim() || 'Dokument';
    const isNew = linkEl.classList.contains('p-base-bold');
    const dateCell = row.querySelectorAll('td')[1];
    const dateText = dateCell?.textContent?.replace('Datum', '').trim() || '';
    const idMatch = url.match(/\/doc\/(\d+)\//);
    const id = idMatch ? idMatch[1] : Math.random().toString(36).substr(2, 9);

    docs.push({
      id,
      title,
      date: dateText,
      url: url.startsWith('http') ? url : `https://mein.finanzen-zero.net${url}`,
      isNew,
      element: row as HTMLElement
    });
  });

  const toDownload = onlyNew ? docs.filter(d => d.isNew) : docs;
  if (toDownload.length === 0) return alert('Keine Dokumente gefunden.');
  if (!confirm(`${toDownload.length} Dokumente als ZIP herunterladen?`)) return;

  const zip = new JSZip();
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;top:20px;right:20px;background:#248eff;color:white;padding:15px;border-radius:5px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1)';
  status.textContent = `Lade 0/${toDownload.length}...`;
  document.body.appendChild(status);

  // Track filenames to handle duplicates
  const filenameCount: { [key: string]: number } = {};
  // Track time offsets per date for display mode
  const dateTimeOffsets: { [key: string]: number } = {};

  let count = 0;
  for (const doc of toDownload) {
    try {
      const response = await fetch(doc.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();

      let filename = '';
      const useDisplayMode = settings.postboxFilenameMode === 'display';

      if (useDisplayMode) {
        // Display mode: date prefix + title
        const [day, month, year] = doc.date.split('.');
        const datePrefix = `${year}-${month}-${day}`;
        const cleanTitle = doc.title.replace(/[^a-zA-Z0-9äöüÄÖÜß \-_]/g, '').trim();
        filename = `${datePrefix}_${cleanTitle}.pdf`;
      } else {
        // Original mode: extract from headers or URL
        const contentDisp = response.headers.get('Content-Disposition');
        if (contentDisp) {
          const match = contentDisp.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
          if (match && match[1]) filename = match[1].replace(/['"]/g, '');
        }
        if (!filename) {
          const urlParts = doc.url.split('/');
          filename = urlParts[urlParts.length - 1] || `doc_${doc.id}.pdf`;
        }
      }

      // Handle duplicate filenames
      if (filenameCount[filename]) {
        const base = filename.replace(/\.pdf$/i, '');
        const ext = '.pdf';
        filenameCount[filename]++;
        filename = `${base}_${filenameCount[filename]}${ext}`;
      } else {
        filenameCount[filename] = 1;
      }

      // Parse date from table (DD.MM.YYYY)
      const [day, month, year] = doc.date.split('.');
      const dateKey = `${year}-${month}-${day}`;

      // Initialize time offset for this date if not exists
      if (!dateTimeOffsets[dateKey]) {
        dateTimeOffsets[dateKey] = 0;
      }

      // Create file date with time offset
      // Set to noon (12:00) to avoid timezone issues
      // Newest files (top of list) get earliest time: 12:00
      // Each subsequent file on same day increments by 1 minute: 12:01, 12:02, etc.
      const minutesOffset = dateTimeOffsets[dateKey];
      const fileDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        12,  // Hour: 12 (noon)
        0 + minutesOffset,  // Minutes: start at 0, increment
        0,   // Seconds
        0    // Milliseconds
      );

      dateTimeOffsets[dateKey]++;

      zip.file(filename, blob, { date: fileDate });
      count++;
      status.textContent = `Lade ${count}/${toDownload.length}...`;
      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error('Error:', e);
    }
  }

  status.textContent = 'Erstelle ZIP...';
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = `Zero-Posteingang_Download_vom_${new Date().toISOString().split('T')[0]}.zip`;
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    status.style.background = '#28a745';
    status.textContent = `✓ ${count} Dateien heruntergeladen!`;
    setTimeout(() => document.body.removeChild(status), 3000);
  } catch (e) {
    status.style.background = '#dc3545';
    status.textContent = '✗ Fehler beim Erstellen';
    setTimeout(() => document.body.removeChild(status), 5000);
  }
};

// Initialize at end of script
setTimeout(() => {
  initPostboxDownloader(settings.postboxDownloaderEnabled);
}, 1000);
