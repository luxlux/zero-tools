/**
 * Price Buttons Feature - Main Export
 * Import everything from here for clean dependencies
 */

// Core types
export * from './core/types';

// Core classes
export { FixModeManager } from './core/FixModeManager';
export { PriceButtonController } from './core/PriceButtonController';

// Adapters
export { OrderInputPriceSource, OrderInputPriceTarget } from './adapters/OrderInputAdapter';
export { ConfirmPagePriceSource, ConfirmPagePriceTarget } from './adapters/ConfirmPageAdapter';

// Utils
export * from './utils/priceFormatting';
export * from './utils/offsetCalculation';
