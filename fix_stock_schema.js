const fs = require('fs');
let seoJs = fs.readFileSync('seo.js', 'utf8');

const stockUpgrade = `
                // Determine stock availability with higher precision
                let availability = "https://schema.org/InStock";
                const outOfStockEl = document.querySelector('.out-of-stock, .product-badge.out-of-stock, .stock-status.out');
                if (outOfStockEl || (priceEl && priceEl.textContent.toLowerCase().includes("out of stock"))) {
                    availability = "https://schema.org/OutOfStock";
                }
`;

seoJs = seoJs.replace(/let availability = "https:\/\/schema\.org\/InStock";[\s\S]*?availability = "https:\/\/schema\.org\/OutOfStock";\s+}/, stockUpgrade);

fs.writeFileSync('seo.js', seoJs);
console.log('Merchant Stock Logic Synchronized: Schema now detects .out-of-stock badges correctly.');
