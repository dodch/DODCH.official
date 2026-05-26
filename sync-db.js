/**
 * Sync Firestore Products to local prices.json
 * --------------------------------------------
 * Runs in GitHub Actions using administrative access (via service account).
 * Bypasses public security rules and App Check block perfectly.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// ─── Initialize Firebase Admin ──────────────────────────────────────────────
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } catch (e) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT secret:', e.message);
        process.exit(1);
    }
} else {
    // Local fallback: tries to use local Firebase CLI credentials
    admin.initializeApp();
}

const db = admin.firestore();

async function run() {
    try {
        console.log('🔄 Fetching live products from Firestore...');
        const snapshot = await db.collection('products').get();
        
        if (snapshot.empty) {
            console.warn('⚠️ No products found in the "products" collection.');
            process.exit(0);
        }

        // Load existing prices.json to merge custom configurations
        let existingPrices = {};
        try {
            const raw = fs.readFileSync(path.join(__dirname, 'prices.json'), 'utf-8');
            existingPrices = JSON.parse(raw);
        } catch (e) {
            // No existing prices.json, start fresh
        }

        const newPrices = {
            "_comment": "Single source of truth for product prices. Automatically updated by GitHub Actions. Run 'node build.js' after manual changes."
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const existing = existingPrices[id] || {};

            // Resolve standard price: default to base price or first size option
            let priceValue = '0.00';
            if (data.price) {
                priceValue = data.price;
            } else if (data.basePrice) {
                priceValue = data.basePrice;
            } else if (data.sizes) {
                if (Array.isArray(data.sizes) && data.sizes[0] && data.sizes[0].price) {
                    priceValue = data.sizes[0].price;
                } else if (typeof data.sizes === 'object') {
                    const firstSize = Object.values(data.sizes)[0];
                    if (firstSize) priceValue = firstSize;
                }
            }

            // Clean price string (e.g. remove " TND")
            if (typeof priceValue === 'string') {
                priceValue = priceValue.replace(/[^0-9.]/g, '');
            } else if (typeof priceValue === 'number') {
                priceValue = priceValue.toFixed(2);
            }

            // Determine availability
            const isOutOfStock = data.outOfStock === true || data.availability === 'out_of_stock';
            const availability = isOutOfStock ? 'out_of_stock' : 'in_stock';

            newPrices[id] = {
                sku: data.sku || existing.sku || `DODCH-${id.toUpperCase()}`,
                price: priceValue,
                currency: 'TND',
                availability: availability
            };
        });

        // Write to prices.json
        fs.writeFileSync(
            path.join(__dirname, 'prices.json'), 
            JSON.stringify(newPrices, null, 2),
            'utf-8'
        );
        console.log('✅ prices.json synchronized successfully with live Firestore data.');
        
    } catch (err) {
        console.error('❌ Error synchronizing with Firestore:', err.message);
        process.exit(1);
    }
}

run();
