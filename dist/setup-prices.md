# Firebase Prices Collection Setup

The Cloud Function expects a `prices` collection in Firestore. Set up each product with this structure:

## Document IDs (must match product catalog IDs)
- `dodchmellow-pro-v`
- `foaming-cleanser`
- `silk-therapy-mask`
- `advanced-ha-serum`
- `glass-glow-shampoo`

## Example Document Structure

### For `dodchmellow-pro-v`:
```json
{
  "basePrice": 42.99,
  "sizes": {
    "250ml": 42.99,
    "500ml": 69.99
  }
}
```

### For `foaming-cleanser`:
```json
{
  "basePrice": 38.99,
  "sizes": {
    "150ml": 38.99,
    "300ml": 64.99
  }
}
```

### For `silk-therapy-mask`:
```json
{
  "basePrice": 45.99,
  "sizes": {
    "200ml": 45.99,
    "400ml": 74.99
  }
}
```

### For `advanced-ha-serum`:
```json
{
  "basePrice": 52.99,
  "sizes": {
    "30ml": 52.99,
    "60ml": 89.99
  }
}
```

### For `glass-glow-shampoo` (out of stock):
```json
{
  "basePrice": 0,
  "outOfStock": true,
  "sizes": {}
}
```

## How to Add These to Firebase

### Option 1: Firebase Console
1. Go to Firebase Console → Firestore Database
2. Create a new collection called `prices`
3. Add documents with IDs above and the data shown

### Option 2: Firebase CLI
Use the Firebase Emulator or direct API calls to populate prices.

## How the Cloud Function Uses This

- When an order is placed, the function looks up each item's productId in the `prices` collection
- It uses the `sizes[sizeLabel]` price if available, otherwise falls back to `basePrice`
- Prices from Firebase override frontend prices (more secure)
- If a price document is missing, frontend price is used with sanity checks
