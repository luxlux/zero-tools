# Core Layer - Business Logic Only

## ⚠️ CRITICAL RULES

This directory contains **page-agnostic business logic**.

### ✅ ALLOWED in this directory:
- Interfaces and type definitions
- Business logic (price calculations, offset logic)
- State management (Fix mode)
- Pure functions
- Classes that work WITHOUT a browser

### ❌ FORBIDDEN in this directory:
- `document.querySelector()` or any DOM access
- Direct DOM manipulation
- Hardcoded CSS selectors
- Browser-specific APIs
- Calling functions from `index.ts` that use DOM

## How to add features

1. **Define interface in `types.ts`** first
2. **Implement in controller** using only interfaces
3. **Update adapters** to provide the data

## Example

```typescript
// ❌ BAD - Direct DOM access
class PriceButtonController {
  getPrice() {
    return document.querySelector('.price')?.textContent;
  }
}

// ✅ GOOD - Using interface
class PriceButtonController {
  constructor(private source: PriceSource) {}
  
  getPrice() {
    return this.source.getCurrentPrice('bid');
  }
}
```

## Testing

Code in this directory should be **unit testable** without a browser.
If you need a browser to test it, it belongs in `adapters/`.

## For AI Assistants

- Never add `document.*` calls here
- If you need DOM data: extend the adapter interface
- TypeScript will prevent violations (use it!)
- When in doubt: ask the user
