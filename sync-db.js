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
        console.log('🔄 Fetching live database products...');
        
        // Fetch both 'products' and 'prices' collections to match storefront logic
        const [productsSnap, pricesSnap] = await Promise.all([
            db.collection('products').get(),
            db.collection('prices').get()
        ]);

        console.log(`🔍 Fetched ${productsSnap.size} documents from 'products' collection.`);
        console.log(`🔍 Fetched ${pricesSnap.size} documents from 'prices' collection.`);

        // Build a lookup map of prices overrides
        const priceOverrides = {};
        pricesSnap.forEach(doc => {
            console.log(`   [prices override db] Found doc ID: "${doc.id}" ->`, JSON.stringify(doc.data()));
            priceOverrides[doc.id] = doc.data();
        });

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

        productsSnap.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            const existing = existingPrices[id] || {};
            
            console.log(`\n🔎 Resolving price for product ID: "${id}"`);
            console.log(`   - Raw product data:`, JSON.stringify(data));

            // ─── Authoritative Price Selection (Matches storefront logic) ───
            let priceValue = '';
            let source = 'none';
            
            // Check 'prices' override collection first
            const priceData = priceOverrides[id];
            if (priceData) {
                console.log(`   - Found price override entry:`, JSON.stringify(priceData));
                if (priceData.basePrice) {
                    priceValue = priceData.basePrice;
                    source = 'prices.basePrice';
                } else if (priceData.price) {
                    priceValue = priceData.price;
                    source = 'prices.price';
                } else if (priceData.sizes) {
                    // Get lowest price from sizes if no basePrice is explicitly set
                    if (typeof priceData.sizes === 'object') {
                        const vals = Object.values(priceData.sizes).map(v => parseFloat(v)).filter(v => !isNaN(v));
                        if (vals.length > 0) {
                            priceValue = Math.min(...vals).toFixed(2);
                            source = 'prices.sizes.min';
                        }
                    }
                }
            }

            // Fallback to 'products' collection fields
            if (!priceValue) {
                if (data.price) {
                    priceValue = data.price;
                    source = 'products.price';
                } else if (data.basePrice) {
                    priceValue = data.basePrice;
                    source = 'products.basePrice';
                } else if (data.sizes) {
                    if (Array.isArray(data.sizes) && data.sizes[0] && data.sizes[0].price) {
                        priceValue = data.sizes[0].price;
                        source = 'products.sizes[0].price';
                    } else if (typeof data.sizes === 'object') {
                        const vals = Object.values(data.sizes).map(v => parseFloat(v)).filter(v => !isNaN(v));
                        if (vals.length > 0) {
                            priceValue = Math.min(...vals).toFixed(2);
                            source = 'products.sizes.min';
                        }
                    }
                }
            }

            // Default fallback
            if (!priceValue) {
                priceValue = '0.00';
                source = 'default_fallback';
            }

            console.log(`   => Resolved price: "${priceValue}" from source: [${source}]`);

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
        console.log('\n✅ prices.json synchronized successfully with live Firestore data.');
        
    } catch (err) {
        console.error('❌ Error synchronizing with Firestore:', err.message);
        process.exit(1);
    }
}

run();
