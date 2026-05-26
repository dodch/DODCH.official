/**
 * Google Merchant Center Feed Generator
 * ----------------------------------------
 * Reads product schemas from HTML files and prices from prices.json.
 * prices.json is the SINGLE SOURCE OF TRUTH for product pricing.
 * After updating prices in Firestore → update prices.json → run: node build.js
 */
const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://dodch.com';

// ── Load authoritative prices from prices.json ──────────────────────────────
let priceConfig = {};
try {
    const rawPrices = fs.readFileSync(path.join(__dirname, 'prices.json'), 'utf-8');
    priceConfig = JSON.parse(rawPrices);
} catch (e) {
    console.warn('⚠️  Could not load prices.json — falling back to HTML schema prices.');
}

// Build a lookup map: sku → priceEntry (for fast resolution by SKU)
const skuPriceMap = {};
Object.values(priceConfig).forEach(entry => {
    if (entry.sku) skuPriceMap[entry.sku] = entry;
});

// ── Category mapping ─────────────────────────────────────────────────────────
function getGoogleCategory(title, filename) {
    const t = title.toLowerCase();
    const f = filename.toLowerCase();
    if (f.includes('dodchmellow') || f.includes('shampoo') || t.includes('shampoo')) {
        return '543615'; // Personal Care > Hair Care > Shampoo
    }
    if (f.includes('mask') || t.includes('mask') || t.includes('conditioner')) {
        return '543616'; // Personal Care > Hair Care > Conditioners & Treatments
    }
    if (f.includes('foam') || t.includes('cleanser') || t.includes('foam')) {
        return '2548';   // Health & Beauty > Personal Care > Cosmetics > Skin Care > Facial Cleansers
    }
    if (f.includes('serum') || t.includes('serum') || t.includes('hyaluronic')) {
        return '5220';   // Health & Beauty > Personal Care > Cosmetics > Skin Care > Serums & Essences
    }
    return '567';        // Health & Beauty > Personal Care > Cosmetics > Skin Care (default)
}

// ── Parse HTML files for Product schemas ─────────────────────────────────────
const htmlFiles = fs.readdirSync(__dirname).filter(f => f.endsWith('.html'));
let items = '';
let productCount = 0;

htmlFiles.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    const schemaMatches = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);

    if (!schemaMatches) return;

    schemaMatches.forEach(match => {
        try {
            const jsonStr = match
                .replace(/<script type="application\/ld\+json">/, '')
                .replace(/<\/script>/, '');
            const data = JSON.parse(jsonStr);

            if (data['@type'] !== 'Product') return;

            const sku = data.sku || data.mpn || '';
            const id = sku || file.replace('.html', '');
            const title = data.name || '';
            const description = data.description || '';
            const link = data.offers?.url || `${DOMAIN}/${file}`;

            // Resolve image
            let image = '';
            if (Array.isArray(data.image)) image = data.image[0];
            else if (typeof data.image === 'string') image = data.image;

            // ── Resolve price: prices.json wins over HTML schema ────────────
            let priceValue = '';
            let availability = 'in_stock';
            const priceEntry = skuPriceMap[sku];
            if (priceEntry && priceEntry.price) {
                priceValue = `${priceEntry.price} ${priceEntry.currency || 'TND'}`;
                availability = priceEntry.availability || 'in_stock';
            } else if (data.offers?.price) {
                // Fallback: use the HTML schema price
                priceValue = `${data.offers.price} TND`;
                console.warn(`  ⚠️  ${file}: price sourced from HTML schema (add SKU ${sku} to prices.json for accuracy)`);
            }

            // Skip products with no price or marked out_of_stock with no price
            if (!priceValue) {
                console.log(`  ⏭  Skipping ${file} — no price available.`);
                return;
            }

            const category = getGoogleCategory(title, file);
            const brand = data.brand?.name || 'DODCH';

            items += `
    <item>
      <g:id>${id}</g:id>
      <title><![CDATA[${title}]]></title>
      <description><![CDATA[${description}]]></description>
      <link>${link}</link>
      <g:image_link>${image}</g:image_link>
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${priceValue}</g:price>
      <g:google_product_category>${category}</g:google_product_category>
      <g:identifier_exists>false</g:identifier_exists>
    </item>`;
            productCount++;

        } catch (e) {
            console.warn(`  ⚠️  Could not parse schema in ${file}:`, e.message);
        }
    });
});

// ── Write XML ─────────────────────────────────────────────────────────────────
const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>DODCH Products</title>
    <link>${DOMAIN}</link>
    <description>DODCH Product Data Feed</description>
    ${items.trimStart()}
  </channel>
</rss>`;

fs.writeFileSync(path.join(__dirname, 'products.xml'), xml, 'utf-8');
console.log(`✅ Generated products.xml — ${productCount} product(s) included.`);
