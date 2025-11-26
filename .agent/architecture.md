# Architecture Documentation

## Last Updated: 2025-11-26

---

## Price Buttons Feature - Separation of Concerns

### Context
The price buttons feature (main buttons like "Bid als Limit", offset buttons, Fix mode) was previously implemented with business logic mixed into DOM manipulation. This made it:
- Hard to maintain (changes broke other parts)
- Difficult to extend (duplicate code for Order Input vs Confirm page)
- Fragile when the website DOM changes
- Nearly impossible to reuse for other brokers

### Decision: Layered Architecture

```
src/content/features/priceButtons/
├── core/                    ← Business Logic (NO DOM)
│   ├── types.ts            ← Interfaces & types
│   ├── PriceButtonController.ts
│   └── FixModeManager.ts
├── adapters/               ← DOM Integration (ONLY place for DOM)
│   ├── OrderInputAdapter.ts
│   └── ConfirmPageAdapter.ts
└── utils/                  ← Shared utilities
    └── priceFormatting.ts
```

### Principles

#### 1. **Core Layer (Business Logic)**
- ✅ Calculate prices with offsets
- ✅ Manage Fix mode state
- ✅ Format button labels
- ✅ Handle button clicks (abstract)
- ❌ NO `document.querySelector()`
- ❌ NO direct DOM manipulation
- ❌ NO hardcoded selectors

**Why:** Core logic should work without a browser. Testable, reusable, portable.

#### 2. **Adapter Layer (DOM Integration)**
- ✅ Query DOM for current prices
- ✅ Set limit values in input fields
- ✅ Create and append DOM elements
- ✅ Handle browser-specific edge cases
- ❌ NO business logic (price calculations, formatting)

**Why:** When the website DOM changes, ONLY adapters need updates.

#### 3. **Dependency Injection**
```typescript
// ❌ BAD: Direct coupling
class Controller {
  getPrice() {
    return document.querySelector('.price')?.textContent; // DOM access!
  }
}

// ✅ GOOD: Abstraction
interface PriceSource {
  getPrice(): string | null;
}

class Controller {
  constructor(private source: PriceSource) {}
  
  getPrice() {
    return this.source.getPrice(); // No DOM knowledge!
  }
}
```

---

## Rules for AI Assistants

### When Modifying Price Buttons:

1. **Check which layer you're in:**
   - `core/`? → NO DOM access allowed
   - `adapters/`? → DOM access OK, but NO business logic
   - `utils/`? → Pure functions only

2. **If you need to add a feature:**
   - Define interface in `types.ts` first
   - Implement in `core/` (using interfaces)
   - Update adapters to provide data

3. **If the website DOM changes:**
   - ONLY edit `adapters/`
   - Update selectors, not logic

4. **Never mix layers in one file:**
   - Bad: Adding `document.querySelector()` to Controller
   - Good: Adding new method to adapter interface

5. **Before making changes, ask yourself:**
   - Can this be tested without a browser? → `core/`
   - Does this interact with the DOM? → `adapters/`
   - Is this a pure function? → `utils/`

### TypeScript as Guardian

The TypeScript compiler will PREVENT you from violating the architecture:
- `core/` classes only accept interfaces (no DOM types)
- If you try to use `document` in `core/`, it won't compile

### When Uncertain

If you're unsure which layer a change belongs to:
1. Ask the user
2. Check `implementation_plan.md` for examples
3. Look at existing similar code in the layer

---

## Migration Strategy

We're migrating incrementally:
1. Keep existing code working
2. Build new architecture alongside
3. Switch over when new code is tested
4. Remove old code

This means:
- Two implementations may coexist temporarily
- Old code marked with `// TODO: Remove after migration`
- New code in `features/priceButtons/`

---

## Future Extensions

This architecture enables:
- ✅ Support for other brokers (new adapters)
- ✅ Unit tests for core logic
- ✅ Different UI variations (same core)
- ✅ Standalone npm package (if needed later)

---

## Testing Strategy

### Core Layer
- Unit tests (without browser)
- Mock the adapters
- Test price calculations, Fix mode logic

### Adapters
- Integration tests (with jsdom or browser)
- Test DOM selectors
- Test data extraction/injection

### End-to-End
- Manual testing on actual website
- Both Order Input and Confirm pages
- All Fix mode scenarios
