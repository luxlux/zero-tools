# Adapters Layer - DOM Integration

## Purpose

Adapters are the **ONLY** place where DOM access is allowed for the price buttons feature.

### ✅ ALLOWED in this directory:
- `document.querySelector()` and DOM queries
- Creating and appending DOM elements
- Reading/writing DOM attributes
- Browser-specific APIs
- Calling existing functions from `index.ts` (like `setLimitValue`)

### ❌ FORBIDDEN in this directory:
- Business logic (price calculations, formatting)
- Duplicating logic from `core/`
- Complex state management

## Adapter Pattern

Each adapter implements interfaces from `core/types.ts`:

```typescript
// Typical adapter structure
export class OrderInputPriceSource implements PriceSource {
  getCurrentPrice(type: PriceType): string | null {
    // DOM access here is OK!
    const container = document.querySelector('.zero-delay-limit-controls');
    return container?.getAttribute(`data-${type}`) || null;
  }
}
```

## When the Website Changes

If the website DOM structure changes:
- **Update ONLY the selectors in adapters**
- **DO NOT touch core/ logic**

Example:
```typescript
// Before: website used class="price"
return document.querySelector('.price')?.textContent;

// After: website changed to class="current-price"
return document.querySelector('.current-price')?.textContent;
```

## For AI Assistants

- This is the ONLY layer where DOM access is OK
- Keep adapters thin - delegate logic to `core/`
- If you're doing complex calculations here, move them to `core/`
- Adapters should be simple data bridges
