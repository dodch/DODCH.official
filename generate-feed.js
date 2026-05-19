const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://dodch.com';
const htmlFiles = fs.readdirSync(__dirname).filter(file => file.endsWith('.html'));

let items = '';

htmlFiles.forEach(file => {
    const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    const schemaMatches = content.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi);
    
    if (schemaMatches) {
        schemaMatches.forEach(match => {
            try {
                const jsonStr = match.replace(/<script type="application\/ld\+json">/, '').replace(/<\/script>/, '');
                const data = JSON.parse(jsonStr);
                
                if (data['@type'] === 'Product') {
                    const id = data.sku || data.mpn || file.replace('.html', '');
                    const title = data.name;
                    const description = data.description || '';
                    const link = data.offers?.url || `${DOMAIN}/${file}`;
                    let image = '';
                    if (Array.isArray(data.image)) image = data.image[0];
                    else if (typeof data.image === 'string') image = data.image;
                    
                    let price = data.offers?.price ? `${data.offers.price} TND` : '';
                    
                    items += `
    <item>
      <g:id>${id}</g:id>
      <g:title>${title.replace(/&/g, '&amp;')}</g:title>
      <g:description>${description.replace(/&/g, '&amp;')}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${image}</g:image_link>
      <g:brand>${data.brand?.name || 'DODCH'}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>in_stock</g:availability>
      <g:price>${price}</g:price>
    </item>`;
                }
            } catch (e) {
                // Ignore parsing errors
            }
        });
    }
});

const xml = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>DODCH Products</title>
    <link>${DOMAIN}</link>
    <description>DODCH Product Data Feed</description>
    ${items}
  </channel>
</rss>`;

fs.writeFileSync(path.join(__dirname, 'products.xml'), xml);
console.log('✅ Generated products.xml feed for Google Merchant Center');
