/**
 * Price Buttons Feature - Main Export
 * Import everything from here for clean dependencies
 */

// Core types
export * from './core/types';

// Core classes
export { PriceButtonController } from './core/PriceButtonController';
export { FixModeManager } from './core/FixModeManager';
export { ButtonFactory } from './core/ButtonFactory';
export type { ButtonConfig } from './core/ButtonFactory';

// Adapters
export { OrderInputPriceSource, OrderInputPriceTarget, OrderInputAdapter } from './adapters/OrderInputAdapter';
export { ConfirmPagePriceSource, ConfirmPagePriceTarget, ConfirmPageAdapter } from './adapters/ConfirmPageAdapter';

// Utils
export * from './utils/priceFormatting';
export * from './utils/offsetCalculation';

// Types
export type { PriceSource, PriceTarget, PriceType, ButtonDisplayInfo } from './core/types';
