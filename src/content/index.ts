import { Clock, Activity, Zap, Info } from 'lucide-react';

// Import new price buttons architecture
import {
  PriceButtonController,
  OrderInputPriceSource,
  OrderInputPriceTarget,
  OrderInputAdapter,
  ConfirmPagePriceSource,
  ConfirmPagePriceTarget,
  ConfirmPageAdapter
} from './features/priceButtons';

declare const chrome: any;

interface Settings {
  isActive: boolean;
  latencyMonitorEnabled: boolean;
  warningThreshold: number;
  criticalThreshold: number;
  featureTwoEnabled: boolean;
  autoCheckEnabled: boolean;
  offsetButtonsEnabled: boolean;
  offsetButtonMode: 'percentage' | 'fixed';
  customOffsets: string;
  offsetButtonStep: number;
  offsetButtonCount: number;
  limitAdjusterEnabled: boolean;
  confirmPageEnabled: boolean;
  confirmPagePerformanceInfoEnabled: boolean;
  postboxDownloaderEnabled: boolean;
  postboxFilenameMode: 'original' | 'display';
}

const defaultSettings: Settings = {
  isActive: true,
  latencyMonitorEnabled: false,
  warningThreshold: 3,
  criticalThreshold: 5,
  featureTwoEnabled: false,
  autoCheckEnabled: false,
  offsetButtonsEnabled: false,
  offsetButtonMode: 'percentage',
  customOffsets: '0.5,1,2,5',
  offsetButtonStep: 0.05,
  offsetButtonCount: 20,
  limitAdjusterEnabled: false,
  confirmPageEnabled: false,
  confirmPagePerformanceInfoEnabled: false,
  postboxDownloaderEnabled: false,
  postboxFilenameMode: 'display'
};

let settings: Settings = { ...defaultSettings };

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
      min-width: 45px;
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
    // Skip step control buttons
    if (btn.classList.contains('zd-step-control-btn')) return;

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

  // F key toggles Fix mode (only if not in input field)
  if (e.key === 'f' || e.key === 'F') {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

    e.preventDefault();

    if (isFixedPriceMode) {
      deactivateFixedPriceMode();
    } else {
      // Check both Order Input and Confirm page containers
      const orderInputContainer = document.querySelector('.zero-delay-limit-controls');
      const confirmContainer = document.querySelector('.zero-delay-confirm-controls');
      const container = orderInputContainer || confirmContainer;

      if (container) {
        if (confirmContainer) {
          // Confirm page always uses 'single'
          activateFixedPriceMode('single');
        } else {
          // Order Input page - check price type
          const hasBid = container.getAttribute('data-has-bid') === 'true';
          const hasAsk = container.getAttribute('data-has-ask') === 'true';
          const hasSingle = container.getAttribute('data-has-single') === 'true';

          if (hasSingle) {
            activateFixedPriceMode('single');
          } else if (hasBid) {
            activateFixedPriceMode('bid');
          } else if (hasAsk) {
            activateFixedPriceMode('ask');
          }
        }
      }
    }

    // Refresh the appropriate page
    if (document.querySelector('.zero-delay-confirm-controls')) {
      document.querySelector('.zero-delay-confirm-controls')?.remove();
      injectConfirmPageButtons();
    } else {
      injectLimitButtons();
    }
  }
});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') {
    isShiftHeld = false;
    updateUIState();
  }
});

// Expose setLimitValue globally so adapters can use it
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

// Expose globally for adapters
// @ts-ignore
window.setLimitValue = setLimitValue;

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

// Step size presets for intuitive value navigation - Strings define the display precision!
const STEP_PRESETS = [
  "0.001", "0.0025", "0.005",
  "0.01", "0.025", "0.05",
  "0.10", "0.25", "0.50",
  "1.00", "2.50", "5.00",
  "10.00", "25.00", "50.00"
];

// Percentage presets - 5 predefined lists with different step sizes
const PERCENTAGE_PRESETS: Record<string, number[]> = {
  'fine-small': [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5, 10, 15, 20, 25, 30, 40, 50],
  'fine-medium': [0.2, 0.4, 0.6, 0.8, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150, 200],
  'standard': [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 7.5, 10, 12.5, 15, 20, 25, 30, 35, 40, 50, 75, 100, 125, 150, 200, 250, 300],
  'coarse': [1, 2, 3, 4, 5, 7.5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 475, 500],
  'very-coarse': [2, 5, 10, 15, 20, 30, 40, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300, 350, 400, 425, 450, 475, 490, 500]
};

const PERCENTAGE_PRESET_KEYS = Object.keys(PERCENTAGE_PRESETS);

// Helper: Find nearest preset to a given step (returns the string format)
const findNearestPreset = (step: number): string => {
  return STEP_PRESETS.reduce((prev, curr) =>
    Math.abs(parseFloat(curr) - step) < Math.abs(parseFloat(prev) - step) ? curr : prev
  );
};

// Helper: Get next smaller preset (returns number for settings)
const getSmallerPreset = (currentStep: number): number => {
  const nearest = findNearestPreset(currentStep);
  const currentIndex = STEP_PRESETS.indexOf(nearest);
  const nextPreset = currentIndex > 0 ? STEP_PRESETS[currentIndex - 1] : STEP_PRESETS[0];
  return parseFloat(nextPreset);
};

// Helper: Get next larger preset (returns number for settings)
const getLargerPreset = (currentStep: number): number => {
  const nearest = findNearestPreset(currentStep);
  const currentIndex = STEP_PRESETS.indexOf(nearest);
  const nextPreset = currentIndex < STEP_PRESETS.length - 1
    ? STEP_PRESETS[currentIndex + 1]
    : STEP_PRESETS[STEP_PRESETS.length - 1];
  return parseFloat(nextPreset);
};

// Helper: Get decimal places from the preset string
const getDecimalPlacesFromPreset = (step: number): number => {
  const preset = findNearestPreset(step);
  if (preset.indexOf('.') === -1) return 0;
  return preset.split('.')[1].length;
};

// Helper: Find nearest percentage preset key
const findNearestPercentagePreset = (currentKey: string): string => {
  return PERCENTAGE_PRESET_KEYS.includes(currentKey)
    ? currentKey
    : PERCENTAGE_PRESET_KEYS[0]; // Default to first if not found
};

// Helper: Get next percentage preset (smaller or larger)
const getNextPercentagePreset = (currentKey: string, direction: 'smaller' | 'larger'): string => {
  const validKey = findNearestPercentagePreset(currentKey);
  const index = PERCENTAGE_PRESET_KEYS.indexOf(validKey);

  if (direction === 'smaller') {
    return index > 0 ? PERCENTAGE_PRESET_KEYS[index - 1] : PERCENTAGE_PRESET_KEYS[0];
  } else {
    return index < PERCENTAGE_PRESET_KEYS.length - 1
      ? PERCENTAGE_PRESET_KEYS[index + 1]
      : PERCENTAGE_PRESET_KEYS[PERCENTAGE_PRESET_KEYS.length - 1];
  }
};

// Helper: Cycle button count through [10, 20, 30, 40, 50]
const cycleButtonCount = (current: number): number => {
  const counts = [10, 20, 30, 40, 50];
  const index = counts.indexOf(current);
  if (index === -1) return counts[0]; // Default to 10 if not found
  return counts[(index + 1) % counts.length];
};

// Global tooltip update interval
let tooltipUpdateInterval: number | null = null;

// OLD Fix Mode state (deprecated - use controllers instead)
let isFixedPriceMode = false;

// Controller instances (NEW architecture)
let orderInputController: PriceButtonController | null = null;
let confirmPageController: PriceButtonController | null = null;
let orderInputAdapter: OrderInputAdapter | null = null;
let confirmPageAdapter: ConfirmPageAdapter | null = null;
let currentPage: 'order' | 'confirm' | null = null;


// Helper: Activate fixed price mode - freezes current price and calculates all offsets
const activateFixedPriceMode = (priceType: 'bid' | 'ask' | 'single') => {
  // Use controller - always
  const controller = currentPage === 'confirm' ? confirmPageController : orderInputController;
  if (!controller) return;

  // On Order Input page, activate BOTH bid and ask
  if (currentPage !== 'confirm' && orderInputController) {
    orderInputController.activateFixMode('bid');
    orderInputController.activateFixMode('ask');
  } else {
    // Confirm page: just the single price type
    controller.activateFixMode(priceType);
  }
  isFixedPriceMode = true;
};

// Helper: Deactivate fixed price mode
const deactivateFixedPriceMode = () => {
  const controller = currentPage === 'confirm' ? confirmPageController : orderInputController;
  if (controller) {
    controller.deactivateFixMode();
  }
  isFixedPriceMode = false;
};

/**
 * Generate offset button data for both percentage and fixed modes
 * Returns array of {offset, label, isPositive} objects
 */
const generateOffsetButtonData = (): Array<{ offset: number; label: string; isPositive: boolean }> => {
  const mode = settings.offsetButtonMode;

  if (mode === 'percentage') {
    // Percentage mode - use preset lists
    const presetKey = findNearestPercentagePreset(settings.customOffsets);
    const preset = PERCENTAGE_PRESETS[presetKey] || PERCENTAGE_PRESETS['standard'];
    const count = settings.offsetButtonCount;
    const valuesToUse = preset.slice(0, count / 2); // Use first N values (half for +, half for -)

    const buttons: Array<{ offset: number; label: string; isPositive: boolean }> = [];

    // Positive buttons
    valuesToUse.forEach(off => {
      buttons.push({ offset: off, label: `+${off.toString().replace('.', ',')}%`, isPositive: true });
    });

    // Negative buttons
    valuesToUse.forEach(off => {
      buttons.push({ offset: off, label: `-${off.toString().replace('.', ',')}%`, isPositive: false });
    });

    return buttons;
  } else {
    // Fixed-step mode
    const step = settings.offsetButtonStep;
    const count = settings.offsetButtonCount;
    const buttonsPerRow = 5;
    const rows = count / 10; // Each 10 buttons = 1 row per side
    const decimals = getDecimalPlacesFromPreset(step);

    const buttons: Array<{ offset: number; label: string; isPositive: boolean }> = [];

    // Generate positive buttons (top rows, in reverse order for display)
    for (let row = rows; row > 0; row--) {
      for (let col = 1; col <= buttonsPerRow; col++) {
        const offsetValue = step * ((row - 1) * buttonsPerRow + col);
        buttons.push({
          offset: offsetValue,
          label: `+${offsetValue.toFixed(decimals).replace('.', ',')}`,
          isPositive: true
        });
      }
    }

    // Generate negative buttons (bottom rows)
    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= buttonsPerRow; col++) {
        const offsetValue = step * ((row - 1) * buttonsPerRow + col);
        buttons.push({
          offset: offsetValue,
          label: `-${offsetValue.toFixed(decimals).replace('.', ',')}`,
          isPositive: false
        });
      }
    }

    return buttons;
  }
};


const injectLimitButtons = () => {
  injectStyles();

  const container = document.querySelector('trade-create-quote') || document.querySelector('div[data-zid="quote-container"]');
  if (!container) return;

  // Detect page switch - ONLY if we are actually on the order page
  if (currentPage === 'confirm') {
    deactivateFixedPriceMode();
  }
  currentPage = 'order';

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

  // Separate structural state from price state
  const structuralState = {
    hasBid: !!(bidPriceStr && !isNaN(parseFloat(bidPriceStr))),
    hasAsk: !!(askPriceStr && !isNaN(parseFloat(askPriceStr))),
    hasSingle: !!(singlePriceStr && !isNaN(parseFloat(singlePriceStr))),
    autoCheck: settings.autoCheckEnabled,
    offsetEnabled: settings.offsetButtonsEnabled,
    offsetMode: settings.offsetButtonMode,
    offsetStep: settings.offsetButtonStep.toString(),
    offsetCount: settings.offsetButtonCount.toString(),
    offsets: settings.customOffsets,
    fixedPriceMode: isFixedPriceMode  // ADD THIS!
  };

  let controls = container.querySelector('.zero-delay-limit-controls') as HTMLElement;

  // If controls exist, check if we only need to update prices
  if (controls) {
    const currentStructure = {
      hasBid: controls.getAttribute('data-has-bid') === 'true',
      hasAsk: controls.getAttribute('data-has-ask') === 'true',
      hasSingle: controls.getAttribute('data-has-single') === 'true',
      autoCheck: controls.getAttribute('data-auto-check') === 'true',
      offsetEnabled: controls.getAttribute('data-offset-enabled') === 'true',
      offsetMode: controls.getAttribute('data-offset-mode') || 'percentage',
      offsetStep: controls.getAttribute('data-offset-step') || '0.05',
      offsetCount: controls.getAttribute('data-offset-count') || '20',
      offsets: controls.getAttribute('data-offsets') || '',
      fixedPriceMode: controls.getAttribute('data-fixed-price-mode') === 'true'  // ADD THIS!
    };

    // If only prices changed, just update data attributes and return
    if (
      structuralState.hasBid === currentStructure.hasBid &&
      structuralState.hasAsk === currentStructure.hasAsk &&
      structuralState.hasSingle === currentStructure.hasSingle &&
      structuralState.autoCheck === currentStructure.autoCheck &&
      structuralState.offsetEnabled === currentStructure.offsetEnabled &&
      structuralState.offsetMode === currentStructure.offsetMode &&
      structuralState.offsetStep === currentStructure.offsetStep &&
      structuralState.offsetCount === currentStructure.offsetCount &&
      structuralState.offsets === currentStructure.offsets &&
      structuralState.fixedPriceMode === currentStructure.fixedPriceMode  // ADD THIS!
    ) {
      // Just update price data
      if (bidPriceStr) controls.setAttribute('data-bid', bidPriceStr);
      if (askPriceStr) controls.setAttribute('data-ask', askPriceStr);
      if (singlePriceStr) controls.setAttribute('data-single', singlePriceStr);
      return;
    }
  }

  // NEW: Create controller instance for new architecture
  // Recreate if mode or step changed
  const controllerKey = `${settings.offsetButtonMode}-${settings.offsetButtonStep}-${settings.offsetButtonCount}`;
  if (!orderInputController || (orderInputController as any)._configKey !== controllerKey) {
    // Generate custom offsets based on mode to match old generateOffsetButtonData
    let offsets: number[] | undefined = undefined;

    if (settings.offsetButtonMode === 'percentage') {
      // Use percentage presets - use 'standard' preset
      const preset = PERCENTAGE_PRESETS['standard'];
      const positiveOffsets = preset.slice(0, settings.offsetButtonCount / 2);
      // Generate both positive and negative offsets
      offsets = [];
      positiveOffsets.forEach(val => {
        offsets!.push(val);
        offsets!.push(-val);
      });
    }
    // For fixed mode, don't set customOffsets - let generateOffsetValues use row-based calculation

    const priceSource = new OrderInputPriceSource();
    const priceTarget = new OrderInputPriceTarget();

    const config = {
      offsetMode: settings.offsetButtonMode,
      customOffsets: offsets || (settings.customOffsets && settings.customOffsets.trim()
        ? settings.customOffsets.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
        : undefined),
      offsetStep: settings.offsetButtonStep,
      offsetCount: settings.offsetButtonCount,
      autoCheck: settings.autoCheckEnabled
    };

    orderInputController = new PriceButtonController(
      priceSource,
      priceTarget,
      config
    );

    // Create adapter instance
    orderInputAdapter = new OrderInputAdapter(orderInputController, priceTarget);

    // Track the config to detect changes
    (orderInputController as any)._configKey = controllerKey;
  }

  // Structural change or first render - recreate buttons
  lastState = {
    bid: bidPriceStr || '',
    ask: askPriceStr || '',
    single: singlePriceStr || '',
    autoCheck: settings.autoCheckEnabled,
    offsetEnabled: settings.offsetButtonsEnabled,
    offsets: settings.customOffsets
  };

  // Cleanup old containers
  container.querySelector('.zero-delay-offset-controls')?.remove();

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
  }

  // Store structural state and prices as data attributes
  controls.setAttribute('data-has-bid', structuralState.hasBid.toString());
  controls.setAttribute('data-has-ask', structuralState.hasAsk.toString());
  controls.setAttribute('data-has-single', structuralState.hasSingle.toString());
  controls.setAttribute('data-auto-check', structuralState.autoCheck.toString());
  controls.setAttribute('data-offset-enabled', structuralState.offsetEnabled.toString());
  controls.setAttribute('data-offset-mode', structuralState.offsetMode);
  controls.setAttribute('data-offset-step', structuralState.offsetStep);
  controls.setAttribute('data-offset-count', structuralState.offsetCount);
  controls.setAttribute('data-offsets', structuralState.offsets);
  controls.setAttribute('data-fixed-price-mode', structuralState.fixedPriceMode.toString());  // ADD THIS!
  if (bidPriceStr) controls.setAttribute('data-bid', bidPriceStr);
  if (askPriceStr) controls.setAttribute('data-ask', askPriceStr);
  if (singlePriceStr) controls.setAttribute('data-single', singlePriceStr);
  const isAutoCheck = settings.autoCheckEnabled;
  let originalValue = '';

  const handleTooltip = (btn: HTMLButtonElement, priceType: 'bid' | 'ask' | 'single', offset?: number, isFixedMode?: boolean) => {
    const updateTooltipContent = () => {
      const controls = btn.closest('.zero-delay-limit-controls');
      if (!controls) return null;

      let basePrice = controls.getAttribute(`data-${priceType}`);
      if (!basePrice) return null;

      let finalPrice = basePrice;
      if (offset !== undefined) {
        const base = parseFloat(basePrice);
        const decimals = Math.max(basePrice.indexOf('.') >= 0 ? basePrice.split('.')[1].length : 2, 4);

        let newPrice: number;
        if (isFixedMode) {
          // Fixed mode: add offset directly
          newPrice = base + offset;
        } else {
          // Percentage mode: multiply by (1 + offset/100)
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
      if (tooltipUpdateInterval) clearInterval(tooltipUpdateInterval);
      tooltipUpdateInterval = window.setInterval(() => {
        const currentPrice = updateTooltipContent();
        if (currentPrice && tooltip && tooltip.style.display !== 'none') {
          formatAndSetTooltip(tooltip, currentPrice);
        }
      }, 100); // Update every 100ms
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
      if (tooltipUpdateInterval) {
        clearInterval(tooltipUpdateInterval);
        tooltipUpdateInterval = null;
      }
    };
  };

  const createBtn = (label: string, priceType: 'bid' | 'ask' | 'single') => {
    // Use adapter to create button
    if (!orderInputAdapter) {
      throw new Error('OrderInputAdapter not initialized');
    }

    return orderInputAdapter.createMainButton(
      priceType as 'bid' | 'ask',
      label,
      isFixedPriceMode,
      isAutoCheck,
      isShiftHeld
    );
  };

  const getDecimals = (str: string) => {
    if (str.indexOf('.') < 0) return 2;
    return str.split('.')[1].length;
  };

  const createOffsetBtn = (priceType: 'bid' | 'ask' | 'single', offset: number, label: string, isFixedMode: boolean) => {
    // Use adapter to create button
    if (!orderInputAdapter) {
      throw new Error('OrderInputAdapter not initialized');
    }

    return orderInputAdapter.createOffsetButton(
      priceType as 'bid' | 'ask',
      offset,
      label,
      isFixedMode,
      isFixedPriceMode,
      isAutoCheck,
      isShiftHeld
    );
  };

  const createPriceGroup = (label: string, priceType: 'bid' | 'ask' | 'single') => {
    const group = document.createElement('div');
    group.className = 'zd-group-col';

    if (settings.offsetButtonsEnabled) {
      const buttonData = generateOffsetButtonData();
      const isFixedMode = settings.offsetButtonMode === 'fixed';

      // Separate positive and negative buttons
      const positiveButtons = buttonData.filter(b => b.isPositive);
      const negativeButtons = buttonData.filter(b => !b.isPositive);

      // Control Buttons (for both fixed and percentage modes)
      const controlRow = document.createElement('div');
      controlRow.className = 'zd-offsets-row';
      controlRow.style.marginBottom = '4px';
      controlRow.style.justifyContent = 'flex-end'; // Right align
      controlRow.style.gap = '4px'; // Small gap

      const applyControlStyle = (btn: HTMLButtonElement) => {
        btn.className = 'zd-btn zd-step-control-btn'; // Add specific class for exclusion
        // Match inactive offset button style
        btn.style.backgroundColor = '#fff';
        btn.style.borderColor = '#ced4da';
        btn.style.color = '#495057';
        btn.style.padding = '0'; // Reset padding for centering
        btn.style.width = '35px'; // Match min-width of offset buttons
        btn.style.height = '20px'; // Match approximate height of offset buttons
        btn.style.minWidth = '35px';
        btn.style.display = 'flex';
        btn.style.alignItems = 'center';
        btn.style.justifyContent = 'center';
        btn.style.fontSize = '10px'; // Match offset button font size

        // Hover effects
        btn.onmouseenter = () => { btn.style.backgroundColor = '#e9ecef'; btn.style.borderColor = '#adb5bd'; };
        btn.onmouseleave = () => { btn.style.backgroundColor = '#fff'; btn.style.borderColor = '#ced4da'; };
      };

      // 1. Kleiner Button (<) - Context-aware
      const smallerBtn = document.createElement('button');
      smallerBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
      applyControlStyle(smallerBtn);
      smallerBtn.title = isFixedMode ? 'Kleinerer Schritt' : 'Vorherige Liste';
      smallerBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deactivateFixedPriceMode(); // Reset fixed mode
        if (isFixedMode) {
          settings.offsetButtonStep = getSmallerPreset(settings.offsetButtonStep);
        } else {
          settings.customOffsets = getNextPercentagePreset(settings.customOffsets, 'smaller');
        }
        injectLimitButtons();
      };

      // 2. Größer Button (>) - Context-aware
      const largerBtn = document.createElement('button');
      largerBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
      applyControlStyle(largerBtn);
      largerBtn.title = isFixedMode ? 'Größerer Schritt' : 'Nächste Liste';
      largerBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deactivateFixedPriceMode(); // Reset fixed mode
        if (isFixedMode) {
          settings.offsetButtonStep = getLargerPreset(settings.offsetButtonStep);
        } else {
          settings.customOffsets = getNextPercentagePreset(settings.customOffsets, 'larger');
        }
        injectLimitButtons();
      };

      // 3. Mode Toggle Button (€ / %)
      const modeToggleBtn = document.createElement('button');
      if (isFixedMode) {
        modeToggleBtn.innerHTML = '<span style="font-size: 11px;">€ <span style="opacity: 0.35;">/</span> <span style="opacity: 0.35;">%</span></span>';
      } else {
        modeToggleBtn.innerHTML = '<span style="font-size: 11px;"><span style="opacity: 0.35;">€</span> <span style="opacity: 0.35;">/</span> %</span>';
      }
      applyControlStyle(modeToggleBtn);
      modeToggleBtn.title = 'Modus wechseln';
      modeToggleBtn.style.width = '40px'; // Slightly wider for text
      modeToggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deactivateFixedPriceMode(); // Reset fixed mode
        settings.offsetButtonMode = isFixedMode ? 'percentage' : 'fixed';
        injectLimitButtons();
      };

      // 4. Fix Button
      const fixBtn = document.createElement('button');
      fixBtn.textContent = 'Fix';
      applyControlStyle(fixBtn);
      fixBtn.title = 'Preise auf offset Buttons fixieren, Taste: F';

      // Update styling based on state
      if (isFixedPriceMode) {
        fixBtn.style.backgroundColor = '#000';
        fixBtn.style.color = '#fff';
        fixBtn.style.borderColor = '#000';
        fixBtn.onmouseenter = () => {
          fixBtn.style.backgroundColor = '#333';
          fixBtn.style.borderColor = '#333';
        };
        fixBtn.onmouseleave = () => {
          fixBtn.style.backgroundColor = '#000';
          fixBtn.style.borderColor = '#000';
        };
      }

      fixBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isFixedPriceMode) {
          deactivateFixedPriceMode();
        } else {
          activateFixedPriceMode(priceType);
        }

        injectLimitButtons(); // Refresh to show new labels
      };

      // 5. Row Count Cycler (Z)
      const rowCycleBtn = document.createElement('button');
      rowCycleBtn.textContent = 'Z';
      applyControlStyle(rowCycleBtn);
      rowCycleBtn.title = 'Zeilenanzahl ändern';
      rowCycleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        deactivateFixedPriceMode(); // Reset fixed mode
        settings.offsetButtonCount = cycleButtonCount(settings.offsetButtonCount);
        injectLimitButtons();
      };

      // 6. Speichern Button (Floppy)
      const saveBtn = document.createElement('button');
      saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
      applyControlStyle(saveBtn);
      saveBtn.title = 'Als Standard speichern';
      saveBtn.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (chrome.runtime?.id) {
            await chrome.storage.local.set({
              offsetButtonStep: settings.offsetButtonStep,
              customOffsets: settings.customOffsets,
              offsetButtonMode: settings.offsetButtonMode,
              offsetButtonCount: settings.offsetButtonCount
            });
            // Visual feedback (Check icon)
            saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(() => {
              saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
            }, 1500);
          }
        } catch (err) {
          console.warn('Zero Tools: Could not save settings');
        }
      };

      // Append in order: < > €/% Fix Z Speichern
      controlRow.appendChild(smallerBtn);
      controlRow.appendChild(largerBtn);
      controlRow.appendChild(modeToggleBtn);
      controlRow.appendChild(fixBtn);
      controlRow.appendChild(rowCycleBtn);
      controlRow.appendChild(saveBtn);
      group.appendChild(controlRow);

      // Group buttons into rows of 5
      const buttonsPerRow = 5;

      // Fixed mode: buttons are already generated in reverse (largest first)
      // Percentage mode: buttons are generated in normal order (smallest first), so we need to reverse
      if (isFixedMode) {
        // Fixed mode: render in order (already reversed in generation)
        for (let i = 0; i < positiveButtons.length; i += buttonsPerRow) {
          const row = document.createElement('div');
          row.className = 'zd-offsets-row';

          const endIdx = Math.min(positiveButtons.length, i + buttonsPerRow);
          for (let j = i; j < endIdx; j++) {
            const btnData = positiveButtons[j];
            row.appendChild(createOffsetBtn(priceType, btnData.offset, btnData.label, isFixedMode));
          }

          group.appendChild(row);
        }
      } else {
        // Percentage mode: render in reverse to get largest at top
        for (let i = positiveButtons.length - 1; i >= 0; i -= buttonsPerRow) {
          const row = document.createElement('div');
          row.className = 'zd-offsets-row';

          const startIdx = Math.max(0, i - buttonsPerRow + 1);
          for (let j = startIdx; j <= i; j++) {
            const btnData = positiveButtons[j];
            row.appendChild(createOffsetBtn(priceType, btnData.offset, btnData.label, isFixedMode));
          }

          group.appendChild(row);
        }
      }

      // Main Button
      group.appendChild(createBtn(label, priceType));

      // Negative buttons in rows (top to bottom)
      for (let i = 0; i < negativeButtons.length; i += buttonsPerRow) {
        const row = document.createElement('div');
        row.className = 'zd-offsets-row';

        const endIdx = Math.min(negativeButtons.length, i + buttonsPerRow);
        for (let j = i; j < endIdx; j++) {
          const btnData = negativeButtons[j];
          row.appendChild(createOffsetBtn(priceType, -btnData.offset, btnData.label, isFixedMode));
        }

        group.appendChild(row);
      }
    } else {
      // No offset buttons, just main button
      group.appendChild(createBtn(label, priceType));
    }

    return group;
  };

  if (structuralState.hasBid && structuralState.hasAsk) {
    controls.appendChild(createPriceGroup('Bid als Limit', 'bid'));

    const separator = document.createElement('div');
    separator.textContent = '/';
    separator.className = 'zd-separator';
    controls.appendChild(separator);

    controls.appendChild(createPriceGroup('Ask als Limit', 'ask'));
  } else if (structuralState.hasBid) {
    controls.appendChild(createPriceGroup('Bid als Limit', 'bid'));
  } else if (structuralState.hasAsk) {
    controls.appendChild(createPriceGroup('Ask als Limit', 'ask'));
  } else if (structuralState.hasSingle) {
    controls.appendChild(createPriceGroup('Kurs als Limit', 'single'));
  }
  // Update UI state to ensure correct initial styling
  updateUIState();
};

const injectConfirmPageButtons = () => {
  // Only inject if master switch (featureTwoEnabled) is active
  if (!settings.featureTwoEnabled || !settings.confirmPageEnabled) return;

  const confirmPage = document.querySelector('trade-confirm');
  if (!confirmPage) {
    document.querySelector('.zero-delay-confirm-controls')?.remove();
    return;
  }

  // Detect page switch - ONLY if we are actually on the confirm page
  if (currentPage === 'order') {
    deactivateFixedPriceMode();
  }
  currentPage = 'confirm';

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

  // NEW: Create controller instance for new architecture
  // Recreate if mode or step changed
  const controllerKey = `${settings.offsetButtonMode}-${settings.offsetButtonStep}-${settings.offsetButtonCount}`;
  if (!confirmPageController || (confirmPageController as any)._configKey !== controllerKey) {
    // Generate custom offsets based on mode to match old generateOffsetButtonData
    let offsets: number[] | undefined = undefined;

    if (settings.offsetButtonMode === 'percentage') {
      // Use percentage presets - use 'standard' preset
      const preset = PERCENTAGE_PRESETS['standard'];
      const positiveOffsets = preset.slice(0, settings.offsetButtonCount / 2);
      // Generate both positive and negative offsets
      offsets = [];
      positiveOffsets.forEach(val => {
        offsets!.push(val);
        offsets!.push(-val);
      });
    }
    // For fixed mode, don't set customOffsets - let generateOffsetValues use row-based calculation

    const config = {
      offsetMode: settings.offsetButtonMode,
      customOffsets: offsets || (settings.customOffsets && settings.customOffsets.trim()
        ? settings.customOffsets.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
        : undefined),
      offsetStep: settings.offsetButtonStep,
      offsetCount: settings.offsetButtonCount,
      autoCheck: false, // Confirm page doesn't auto-check
      currentStepSize: settings.offsetButtonStep
    };

    const priceSource = new ConfirmPagePriceSource();
    const priceTarget = new ConfirmPagePriceTarget();

    confirmPageController = new PriceButtonController(
      priceSource,
      priceTarget,
      config
    );

    // Create adapter instance
    confirmPageAdapter = new ConfirmPageAdapter(confirmPageController, priceTarget);

    // Track the config to detect changes
    (confirmPageController as any)._configKey = controllerKey;
  }

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
  const decimals = priceStr.indexOf('.') >= 0 ? priceStr.split('.')[1].length : 2;

  // Check if we already injected buttons
  let controls = confirmPage.querySelector('.zero-delay-confirm-controls') as HTMLElement;

  // ALWAYS update the current price on the controls container
  if (controls) {
    controls.setAttribute('data-current-price', priceStr);
    controls.setAttribute('data-decimals', decimals.toString());
  }

  // Also update performance price container if it exists (for Performance-Info when Order-Änderung is off)
  const perfContainer = confirmPage.querySelector('.zd-performance-price-container') as HTMLElement;
  if (perfContainer) {
    perfContainer.setAttribute('data-current-price', priceStr);
    perfContainer.setAttribute('data-decimals', decimals.toString());
  }

  // If controls exist, we're done (already injected)
  if (controls) {
    return;
  }

  // Create container
  controls = document.createElement('div');
  controls.className = 'zero-delay-confirm-controls d-flex flex-column align-items-end mt-3 mb-3';
  controls.style.gap = '8px';
  // Set initial price data
  controls.setAttribute('data-current-price', priceStr);
  controls.setAttribute('data-decimals', decimals.toString());

  // Header
  const header = document.createElement('div');
  header.className = 'font-bold';
  header.textContent = isLimitOrder ? 'Limit ändern:' : 'Zu Limit Order wechseln:';
  controls.appendChild(header);

  // Create price group container
  const group = document.createElement('div');
  group.className = 'zd-price-group';

  const basePrice = parseFloat(priceStr);

  // Offset buttons
  if (settings.offsetButtonsEnabled) {
    const buttonData = generateOffsetButtonData();
    const isFixedMode = settings.offsetButtonMode === 'fixed';

    // Separate positive and negative buttons
    const positiveButtons = buttonData.filter(b => b.isPositive);
    const negativeButtons = buttonData.filter(b => !b.isPositive);

    // Control Buttons (for both fixed and percentage modes)
    const controlRow = document.createElement('div');
    controlRow.className = 'zd-offsets-row';
    controlRow.style.marginBottom = '4px';
    controlRow.style.justifyContent = 'flex-end'; // Right align
    controlRow.style.gap = '4px'; // Small gap

    const applyControlStyle = (btn: HTMLButtonElement) => {
      btn.className = 'zd-btn zd-step-control-btn'; // Add specific class for exclusion
      // Match inactive offset button style
      btn.style.backgroundColor = '#fff';
      btn.style.borderColor = '#ced4da';
      btn.style.color = '#495057';
      btn.style.padding = '0'; // Reset padding for centering
      btn.style.width = '35px'; // Match min-width of offset buttons
      btn.style.height = '20px'; // Match approximate height of offset buttons
      btn.style.minWidth = '35px';
      btn.style.display = 'flex';
      btn.style.alignItems = 'center';
      btn.style.justifyContent = 'center';
      btn.style.fontSize = '10px'; // Match offset button font size

      // Hover effects
      btn.onmouseenter = () => { btn.style.backgroundColor = '#e9ecef'; btn.style.borderColor = '#adb5bd'; };
      btn.onmouseleave = () => { btn.style.backgroundColor = '#fff'; btn.style.borderColor = '#ced4da'; };
    };

    // 1. Kleiner Button (<) - Context-aware
    const smallerBtn = document.createElement('button');
    smallerBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
    applyControlStyle(smallerBtn);
    smallerBtn.title = isFixedMode ? 'Kleinerer Schritt' : 'Vorherige Liste';
    smallerBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      deactivateFixedPriceMode(); // Reset fixed mode
      if (isFixedMode) {
        settings.offsetButtonStep = getSmallerPreset(settings.offsetButtonStep);
      } else {
        settings.customOffsets = getNextPercentagePreset(settings.customOffsets, 'smaller');
      }
      document.querySelector('.zero-delay-confirm-controls')?.remove();
      injectConfirmPageButtons();
    };

    // 2. Größer Button (>) - Context-aware
    const largerBtn = document.createElement('button');
    largerBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
    applyControlStyle(largerBtn);
    largerBtn.title = isFixedMode ? 'Größerer Schritt' : 'Nächste Liste';
    largerBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      deactivateFixedPriceMode(); // Reset fixed mode
      if (isFixedMode) {
        settings.offsetButtonStep = getLargerPreset(settings.offsetButtonStep);
      } else {
        settings.customOffsets = getNextPercentagePreset(settings.customOffsets, 'larger');
      }
      document.querySelector('.zero-delay-confirm-controls')?.remove();
      injectConfirmPageButtons();
    };

    // 3. Mode Toggle Button (€ / %)
    const modeToggleBtn = document.createElement('button');
    if (isFixedMode) {
      modeToggleBtn.innerHTML = '<span style="font-size: 11px;">€ <span style="opacity: 0.35;">/</span> <span style="opacity: 0.35;">%</span></span>';
    } else {
      modeToggleBtn.innerHTML = '<span style="font-size: 11px;"><span style="opacity: 0.35;">€</span> <span style="opacity: 0.35;">/</span> %</span>';
    }
    applyControlStyle(modeToggleBtn);
    modeToggleBtn.title = 'Modus wechseln';
    modeToggleBtn.style.width = '40px'; // Slightly wider for text
    modeToggleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      deactivateFixedPriceMode(); // Reset fixed mode
      settings.offsetButtonMode = isFixedMode ? 'percentage' : 'fixed';
      document.querySelector('.zero-delay-confirm-controls')?.remove();
      injectConfirmPageButtons();
    };

    // 4. Fix Button
    const fixBtn = document.createElement('button');
    fixBtn.textContent = 'Fix';
    applyControlStyle(fixBtn);
    fixBtn.title = 'Preise auf offset Buttons fixieren, Taste: F';

    // Update styling based on state
    if (isFixedPriceMode) {
      fixBtn.style.backgroundColor = '#000';
      fixBtn.style.color = '#fff';
      fixBtn.style.borderColor = '#000';
      fixBtn.onmouseenter = () => {
        fixBtn.style.backgroundColor = '#333';
        fixBtn.style.borderColor = '#333';
      };
      fixBtn.onmouseleave = () => {
        fixBtn.style.backgroundColor = '#000';
        fixBtn.style.borderColor = '#000';
      };
    }

    fixBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (isFixedPriceMode) {
        deactivateFixedPriceMode();
      } else {
        activateFixedPriceMode('single'); // Confirm page always uses single price
      }

      document.querySelector('.zero-delay-confirm-controls')?.remove();
      injectConfirmPageButtons(); // Refresh to show new labels
    };

    // 5. Row Count Cycler (Z)
    const rowCycleBtn = document.createElement('button');
    rowCycleBtn.textContent = 'Z';
    applyControlStyle(rowCycleBtn);
    rowCycleBtn.title = 'Zeilenanzahl ändern';
    rowCycleBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      deactivateFixedPriceMode(); // Reset fixed mode
      settings.offsetButtonCount = cycleButtonCount(settings.offsetButtonCount);
      document.querySelector('.zero-delay-confirm-controls')?.remove();
      injectConfirmPageButtons();
    };

    // 5. Speichern Button (Floppy)
    const saveBtn = document.createElement('button');
    saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
    applyControlStyle(saveBtn);
    saveBtn.title = 'Als Standard speichern';
    saveBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        if (chrome.runtime?.id) {
          await chrome.storage.local.set({
            offsetButtonStep: settings.offsetButtonStep,
            customOffsets: settings.customOffsets,
            offsetButtonMode: settings.offsetButtonMode,
            offsetButtonCount: settings.offsetButtonCount
          });
          // Visual feedback (Check icon)
          saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          setTimeout(() => {
            saveBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>';
          }, 1500);
        }
      } catch (err) {
        console.warn('Zero Tools: Could not save settings');
      }
    };

    // Append in order: < > €/% Fix Z Speichern
    controlRow.appendChild(smallerBtn);
    controlRow.appendChild(largerBtn);
    controlRow.appendChild(modeToggleBtn);
    controlRow.appendChild(fixBtn);
    controlRow.appendChild(rowCycleBtn);
    controlRow.appendChild(saveBtn);
    group.appendChild(controlRow);

    // Group buttons into rows of 5
    const buttonsPerRow = 5;

    // Fixed mode: buttons are already generated in reverse (largest first)
    // Percentage mode: buttons are generated in normal order (smallest first), so we need to reverse
    if (isFixedMode) {
      // Fixed mode: render in order (already reversed in generation)
      for (let i = 0; i < positiveButtons.length; i += buttonsPerRow) {
        const row = document.createElement('div');
        row.className = 'zd-offsets-row';

        const endIdx = Math.min(positiveButtons.length, i + buttonsPerRow);
        for (let j = i; j < endIdx; j++) {
          const btnData = positiveButtons[j];
          row.appendChild(createConfirmOffsetBtn(btnData.label, btnData.offset, isFixedMode));
        }

        group.appendChild(row);
      }
    } else {
      // Percentage mode: render in reverse to get largest at top
      for (let i = positiveButtons.length - 1; i >= 0; i -= buttonsPerRow) {
        const row = document.createElement('div');
        row.className = 'zd-offsets-row';

        const startIdx = Math.max(0, i - buttonsPerRow + 1);
        for (let j = startIdx; j <= i; j++) {
          const btnData = positiveButtons[j];
          row.appendChild(createConfirmOffsetBtn(btnData.label, btnData.offset, isFixedMode));
        }

        group.appendChild(row);
      }
    }
  }

  // Main Button
  // Dynamic label based on direction
  const mainButtonLabel = isBuy ? 'Ask als Limit' : 'Bid als Limit';
  group.appendChild(createConfirmBtn(mainButtonLabel, 0));

  // Offset buttons - negative
  if (settings.offsetButtonsEnabled) {
    const buttonData = generateOffsetButtonData();
    const isFixedMode = settings.offsetButtonMode === 'fixed';
    const negativeButtons = buttonData.filter(b => !b.isPositive);

    const buttonsPerRow = 5;

    // Render negative buttons in rows (top to bottom)
    for (let i = 0; i < negativeButtons.length; i += buttonsPerRow) {
      const row = document.createElement('div');
      row.className = 'zd-offsets-row';

      const endIdx = Math.min(negativeButtons.length, i + buttonsPerRow);
      for (let j = i; j < endIdx; j++) {
        const btnData = negativeButtons[j];
        row.appendChild(createConfirmOffsetBtn(btnData.label, -btnData.offset, isFixedMode));
      }

      group.appendChild(row);
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
      try {
        if (chrome.runtime?.id) {
          chrome.storage.local.set({ 'zd_just_updated': true });
        }
      } catch (e) {
        console.warn('Zero Tools: Extension context invalidated. Please reload the page.');
      }

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

  // Insert after the trade-confirm-quote element (contains Bid/Ask/Basiswert/Time)
  const quoteElement = confirmPage.querySelector('trade-confirm-quote');

  if (quoteElement) {
    quoteElement.insertAdjacentElement('afterend', controls);
  } else {
    // Fallback: Search for element containing WKN (starts with DE or ISIN usually)
    const wknElement = Array.from(confirmPage.querySelectorAll('.zero-text')).find(el =>
      el.textContent?.trim().match(/^[A-Z]{2}[A-Z0-9]{9}\d$/) || // Strict ISIN
      el.textContent?.includes('DE') ||
      el.textContent?.includes('ISIN')
    );

    const timeElement = Array.from(confirmPage.querySelectorAll('.zero-text')).find(el => el.textContent?.match(/\d{1,2}:\d{2}:\d{2}/));

    let targetElement = wknElement || timeElement;

    if (targetElement) {
      // Find the row container
      let target = targetElement as HTMLElement;
      // Go up until we find a direct child of the main container or a row
      // We want the row that contains this element
      while (target.parentElement && target.parentElement !== confirmPage && !target.parentElement.tagName.includes('TRADE-CONFIRM-DATA')) {
        // If the current element is a row (d-flex justify-content-between), we stop here
        if (target.classList.contains('d-flex') && target.classList.contains('justify-content-between')) {
          break;
        }
        target = target.parentElement;
      }
      target.insertAdjacentElement('afterend', controls);
    } else {
      // Fallback
      upperDiv.insertAdjacentElement('afterend', controls);
    }
  }

  // Ensure wrapper is created and move controls into it
  const wrapper = ensureConfirmPageWrapper();
  if (wrapper && controls && !wrapper.contains(controls)) {
    // Always position controls on the RIGHT with fixed width
    controls.style.maxWidth = '48%';
    controls.style.marginLeft = 'auto';
    wrapper.appendChild(controls);
  }

  // Trigger highlighting check
  checkAndHighlightFields();
};

// Separate function to inject performance info (independent of featureTwoEnabled)
const injectConfirmPagePerformanceInfo = () => {
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
      injectPositionPerformance(priceContainer, isin);
    }
  }
};

// Function to ensure the confirm page wrapper exists (for Order-Änderung and Performance-Info)
const ensureConfirmPageWrapper = () => {
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

// Position Performance Logic
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

const injectPositionPerformance = async (controlsContainer: HTMLElement, isin: string) => {
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
  const wrapper = ensureConfirmPageWrapper();

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

// Helper functions for confirm page buttons (getCalculatedPrice removed - using controller directly now)

// Helper to format button label with faint 3rd+ decimal places
const formatButtonLabel = (label: string): string => {
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
};

const createConfirmBtn = (label: string, offset: number) => {
  const btn = document.createElement('button');
  btn.className = 'zd-btn zd-btn-primary';

  // NEW: Get display text - use getMainButtonLabel for offset 0
  let displayText: string;
  if (isFixedPriceMode && confirmPageController) {
    if (offset === 0) {
      // Main button: use getMainButtonLabel (includes "als Limit")
      displayText = confirmPageController.getMainButtonLabel('single', label);
    } else {
      // Offset button: use getButtonDisplayInfo
      const buttonInfo = confirmPageController.getButtonDisplayInfo('single', offset);
      displayText = buttonInfo.label || label;
      if (buttonInfo.disabled) {
        displayText = '\u200B';
        btn.disabled = true;
        btn.style.opacity = '0.3';
      }
    }
  } else {
    displayText = label;
  }

  btn.innerHTML = formatButtonLabel(displayText);
  btn.setAttribute('data-offset', offset.toString());

  if (!isFixedPriceMode) {
    addTooltipToButton(btn, offset, false);
  }

  btn.style.width = '100%';

  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const tooltip = document.getElementById('zd-tooltip-el');
    if (tooltip) tooltip.style.display = 'none';
    btn.blur();

    // Get price directly from controller
    let price: string;
    if (confirmPageController && isFixedPriceMode) {
      const buttonInfo = confirmPageController.getButtonDisplayInfo('single', offset);
      price = buttonInfo.price || '0';
    } else {
      // Normal mode: get from data attribute
      const controls = btn.closest('.zero-delay-confirm-controls');
      price = controls?.getAttribute('data-current-price') || '0';
    }

    // Convert German format (comma) to English format (dot) for input field
    price = price.replace(',', '.');

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

    try {
      if (chrome.runtime?.id) {
        chrome.storage.local.set({ 'zd_just_updated': true });
      }
    } catch (e) {
      console.warn('Zero Tools: Extension context invalidated. Please reload the page.');
    }
    setLimitValue(price, true);
  };

  return btn;
};

const createConfirmOffsetBtn = (label: string, offset: number, isFixedMode: boolean = false) => {
  const btn = document.createElement('button');

  // NEW: Determine label from controller if in Fix mode
  let displayLabel: string;
  let isNegativePrice = false;
  if (isFixedPriceMode && confirmPageController) {
    const buttonInfo = confirmPageController.getButtonDisplayInfo('single', offset);
    displayLabel = buttonInfo.label;
    isNegativePrice = buttonInfo.disabled;
  } else {
    displayLabel = label;
  }

  btn.innerHTML = formatButtonLabel(displayLabel);
  btn.className = 'zd-btn zd-offset-btn zd-btn-primary';
  btn.setAttribute('data-is-fixed-mode', isFixedMode.toString());

  // Handle empty (negative) buttons in fixed mode
  if (isNegativePrice) {
    btn.style.minHeight = '20px';  // Maintain height even when empty
    btn.style.opacity = '0.3';     // Visual indication it's disabled
    btn.style.cursor = 'not-allowed';
    btn.disabled = true;
  }

  // Dynamic font sizing for long prices in fixed mode
  if (isFixedPriceMode && !isNegativePrice) {
    const digitCount = displayLabel.replace(/[,\s]/g, '').length; // Count digits only
    if (digitCount > 7) {
      // Allow button to grow
      btn.style.width = 'auto';
    } else if (digitCount > 5) {
      // Reduce font size to fit
      btn.style.fontSize = '9px';
    }
    // NO tooltip in fixed mode
  } else if (!isNegativePrice) {
    // Normal mode: show tooltip
    addTooltipToButton(btn, offset, isFixedMode);
  }

  btn.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Disabled if negative price in fixed mode
    if (isNegativePrice) return;

    const tooltip = document.getElementById('zd-tooltip-el');
    if (tooltip) tooltip.style.display = 'none';
    btn.blur();

    // Get price directly from controller
    let price: string;
    if (confirmPageController && isFixedPriceMode) {
      const buttonInfo = confirmPageController.getButtonDisplayInfo('single', offset);
      price = buttonInfo.price || '0';
    } else {
      // Normal mode: calculate from current price
      const controls = btn.closest('.zero-delay-confirm-controls');
      const currentPriceStr = controls?.getAttribute('data-current-price') || '0';
      const currentPrice = parseFloat(currentPriceStr);
      const decimals = Math.max(currentPriceStr.indexOf('.') >= 0 ? currentPriceStr.split('.')[1].length : 2, 4);

      const newPrice = isFixedMode
        ? currentPrice + offset  // Fixed mode: add offset
        : currentPrice * (1 + offset / 100);  // Percentage mode

      price = newPrice.toFixed(decimals);
    }

    // Convert German format (comma) to English format (dot)
    price = price.replace(',', '.');

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

    try {
      if (chrome.runtime?.id) {
        chrome.storage.local.set({ 'zd_just_updated': true });
      }
    } catch (e) {
      console.warn('Zero Tools: Extension context invalidated. Please reload the page.');
    }
    setLimitValue(price, true);
  };

  return btn;
};

const addTooltipToButton = (btn: HTMLButtonElement, offset: number, isFixedMode: boolean = false) => {
  const updateTooltip = () => {
    const tooltip = document.getElementById('zd-tooltip-el');
    if (!tooltip || tooltip.style.display === 'none') return;

    // Get price directly from controller for tooltip display
    let price: string;
    if (confirmPageController && isFixedPriceMode) {
      const buttonInfo = confirmPageController.getButtonDisplayInfo('single', offset);
      price = buttonInfo.price || '0';
    } else {
      // Normal mode: calculate from current price
      const controls = btn.closest('.zero-delay-confirm-controls');
      const currentPriceStr = controls?.getAttribute('data-current-price') || '0';
      const currentPrice = parseFloat(currentPriceStr);
      const decimals = Math.max(currentPriceStr.indexOf('.') >= 0 ? currentPriceStr.split('.')[1].length : 2, 4);

      const newPrice = isFixedMode
        ? currentPrice + offset
        : currentPrice * (1 + offset / 100);

      price = newPrice.toFixed(decimals);
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
  };

  btn.onmouseenter = () => {
    let tooltip = document.getElementById('zd-tooltip-el');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'zd-tooltip-el';
      tooltip.className = 'zd-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.style.display = 'block';
    updateTooltip();

    // Clear any existing interval and start new one (use global interval)
    if (tooltipUpdateInterval) clearInterval(tooltipUpdateInterval);
    tooltipUpdateInterval = window.setInterval(() => {
      updateTooltip();
    }, 100); // Update every 100ms to catch live price changes
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
    // Clear global interval on mouse leave
    if (tooltipUpdateInterval) {
      clearInterval(tooltipUpdateInterval);
      tooltipUpdateInterval = null;
    }
  };
};
const processTimestamps = () => {
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

  injectLimitButtons();
  injectLimitAdjuster();
  // Inject confirm page buttons if enabled
  injectConfirmPageButtons();

  // Inject performance info independently
  injectConfirmPagePerformanceInfo();
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


      const btnExpand = document.createElement('button');
      btnExpand.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:6px">
        <path d="M4 21H17M5 18H19M6 15H21M4 12H19M3 9H19M5.5 6H21M6 3H22" 
              stroke="currentColor" 
              stroke-width="1.5" 
              stroke-linecap="square"/>
      </svg>Alle anzeigen`;
      btnExpand.style.cssText = 'padding:5px 12px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:4px;font-size:14px;font-weight:400;cursor:pointer;transition:all 0.2s;display:inline-flex;align-items:center';
      btnExpand.onmouseover = () => btnExpand.style.background = '#e5e7eb';
      btnExpand.onmouseout = () => btnExpand.style.background = '#f3f4f6';
      btnExpand.onclick = () => expandAllDocs();

      const btnAll = document.createElement('button');
      btnAll.textContent = 'Alle angezeigten laden (ZIP)';
      btnAll.style.cssText = 'padding:5px 12px;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:4px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s';
      btnAll.onmouseover = () => btnAll.style.background = '#c7d2fe';
      btnAll.onmouseout = () => btnAll.style.background = '#e0e7ff';
      btnAll.onclick = () => downloadDocs(false);

      const btnNew = document.createElement('button');
      btnNew.textContent = 'Nur UNGELESENE laden (ZIP)';
      btnNew.style.cssText = 'padding:5px 12px;background:#e0e7ff;color:#3730a3;border:1px solid #c7d2fe;border-radius:4px;font-size:14px;font-weight:500;cursor:pointer;transition:all 0.2s';
      btnNew.onmouseover = () => btnNew.style.background = '#c7d2fe';
      btnNew.onmouseout = () => btnNew.style.background = '#e0e7ff';
      btnNew.onclick = () => downloadDocs(true);

      div.appendChild(btnExpand);
      div.appendChild(btnAll);
      div.appendChild(btnNew);
      container.insertAdjacentElement('beforebegin', div);
    }
  }, 1000);
};

const expandAllDocs = async () => {
  const status = document.createElement('div');
  status.style.cssText = 'position:fixed;top:20px;right:20px;background:#0ea5e9;color:white;padding:15px;border-radius:5px;z-index:9999;box-shadow:0 4px 6px rgba(0,0,0,0.1);font-weight:500';
  status.textContent = 'Expandiere Liste...';
  document.body.appendChild(status);

  let clickCount = 0;

  const clickMore = () => {
    const moreLink = document.querySelector('.link-secondary.cursor-pointer') as HTMLElement;

    // Check if link is hidden (all docs visible) or doesn't exist
    if (!moreLink || moreLink.classList.contains('hidden')) {
      status.style.background = '#10b981';
      const count = document.querySelectorAll('table.table-post tbody tr a[href*="/doc/"]').length;
      status.textContent = `✓ Alle ${count} Dokumente angezeigt!`;
      setTimeout(() => document.body.removeChild(status), 3000);
      return;
    }

    clickCount++;
    const visibleCount = document.querySelectorAll('table.table-post tbody tr a[href*="/doc/"]').length;
    status.textContent = `${visibleCount} Dokumente sichtbar... (${clickCount} Klicks)`;

    moreLink.click();

    // Wait for DOM update, then click again
    setTimeout(clickMore, 150);
  };

  clickMore();
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
  status.textContent = `API-Daten werden geladen...`;
  document.body.appendChild(status);

  // Fetch API data for exact timestamps
  let apiDocsMap: { [id: string]: any } = {};
  try {
    const customerId = window.location.pathname.match(/\/posteingang(?:\/(\d+))?/)?.[1]
      || document.querySelector('[href*="/api/posteingang/"]')?.getAttribute('href')?.match(/\/(\d+)/)?.[1];
    if (customerId) {
      // Determine tab type based on active nav-link: Eingang=P, Archiv=A, MiFID=M
      const activeTab = document.querySelector('.nav-link.active')?.textContent?.trim() || '';
      let tabParam = 'P'; // Default to Eingang
      if (activeTab.includes('Archiv')) {
        tabParam = 'A';
      } else if (activeTab.includes('MiFID')) {
        tabParam = 'M';
      }
      const apiUrl = `https://mein.finanzen-zero.net/api/posteingang/${customerId}?t=${tabParam}&m=1000`;

      const apiResponse = await fetch(apiUrl);
      if (apiResponse.ok) {
        const apiDocs = await apiResponse.json();
        // Create map: doc ID -> API document object
        apiDocs.forEach((apiDoc: any) => {
          apiDocsMap[apiDoc.id.toString()] = apiDoc;
        });
        console.log(`API: ${Object.keys(apiDocsMap).length} Dokumente geladen`);
      }
    }
  } catch (e) {
    console.warn('API-Abfrage fehlgeschlagen, nutze Fallback-Datum:', e);
  }

  status.textContent = `Lade 0/${toDownload.length}...`;

  // Track filenames to handle duplicates
  const filenameCount: { [key: string]: number } = {};
  // Track time offsets per date for fallback (when no API match)
  const dateTimeOffsets: { [key: string]: number } = {};

  // Helper function: Calculate fallback date (12:00 + offset)
  const getFallbackDate = (dateStr: string, offsets: { [key: string]: number }): Date => {
    const [day, month, year] = dateStr.split('.');
    const dateKey = `${year}-${month}-${day}`;

    // Initialize offset for this date if needed
    if (!offsets[dateKey]) {
      offsets[dateKey] = 0;
    }

    const minutesOffset = offsets[dateKey];
    offsets[dateKey]++; // Increment for next file on same date

    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      12,  // Noon
      minutesOffset,
      0,
      0
    );
  };

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

      // Parse date from API data if available, otherwise fallback to DOM date + offset
      let fileDate: Date;
      const apiDoc = apiDocsMap[doc.id];

      if (apiDoc) {
        // API data available - try to get exact timestamp
        let exactDateTime: Date | null = null;

        // Priority 1: pdfOrderDateTime (has exact time)
        if (apiDoc.pdfOrderDateTime) {
          // Format: "31.07.2025 16:16:48:00" -> "DD.MM.YYYY HH:MM:SS:MS"
          const match = apiDoc.pdfOrderDateTime.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/);
          if (match) {
            const [, day, month, year, hour, minute, second] = match;
            exactDateTime = new Date(
              parseInt(year),
              parseInt(month) - 1,
              parseInt(day),
              parseInt(hour),
              parseInt(minute),
              parseInt(second)
            );
          }
        }

        // Priority 2: date field (ISO format, usually midnight)
        if (!exactDateTime && apiDoc.date) {
          // Format: "2025-08-01T00:00:00"
          const isoDate = new Date(apiDoc.date);
          if (!isNaN(isoDate.getTime())) {
            // Check if it has actual time (not just midnight)
            if (isoDate.getHours() !== 0 || isoDate.getMinutes() !== 0) {
              exactDateTime = isoDate;
            }
          }
        }

        if (exactDateTime && !isNaN(exactDateTime.getTime())) {
          fileDate = exactDateTime;
          console.log(`✓ API-Datum für ${doc.title}: ${fileDate.toLocaleString('de-DE')}`);
        } else {
          // API data exists but no valid timestamp - use fallback
          fileDate = getFallbackDate(doc.date, dateTimeOffsets);
          console.log(`⚠ API-Match aber kein Datum für ${doc.title}, Fallback: ${fileDate.toLocaleString('de-DE')}`);
        }
      } else {
        // No API match - use fallback logic
        fileDate = getFallbackDate(doc.date, dateTimeOffsets);
        console.log(`⚠ Kein API-Match für ${doc.title}, Fallback: ${fileDate.toLocaleString('de-DE')}`);
      }

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
  deactivateFixedPriceMode(); // Always start with Fix mode off
  initPostboxDownloader(settings.postboxDownloaderEnabled);
}, 1000);
