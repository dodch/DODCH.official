const fs = require('fs');
let seoJs = fs.readFileSync('seo.js', 'utf8');

// 1. Add Semantic Problem-Solving Keywords
const semanticKeywords = 'best shampoo for frizzy hair Tunisia, treatment for damaged hair, sulfate free shampoo results, hair growth serum Tunisia, organic face cleanser, anti-aging hyaluronic acid serum, clear skin routine Tunisia, luxe hair care review, professional shampoo alternative, أفضل شامبو لتساقط الشعر, علاج تقصف الشعر تونسي, روتين البشرة الدهنية';
seoJs = seoJs.replace(/this\.setMeta\('name', 'keywords', '.*?'\);/, `this.setMeta('name', 'keywords', '${semanticKeywords}');`);

// 2. Add Image Search Hijacking Logic (Dynamically updating Alts)
const imageHijackLogic = `
    hijackImageAlts() {
        const productMapping = {
            'shampoo': 'Luxury Sulfate-Free Glass Glow Shampoo Tunisia - Best for Shine and Repair',
            'mellow': 'DODCHmellow Cloud Shampoo - Ultra Soft Lather for Sensitive Scalp',
            'mask': 'Silk Therapy Hair Mask Tunisia - Professional Damage Repair After After Result',
            'serum': 'Advanced HA Face Serum Tunisia - Immediate Plumping and Hydration Result',
            'cleanser': 'Gentle Foaming Face Cleanser Tunisia - Pore Refining and Luminous Skin'
        };

        const images = document.querySelectorAll('img');
        images.forEach(img => {
            const src = img.src.toLowerCase();
            const alt = img.alt.toLowerCase();
            
            // If alt is empty or too short, or generic, replace it with high-intent keywords
            if (alt.length < 5 || alt.includes('image') || alt.includes('placeholder')) {
                for (const [key, value] of Object.entries(productMapping)) {
                    if (src.includes(key) || document.title.toLowerCase().includes(key)) {
                        img.alt = value;
                        break;
                    }
                }
                // Fallback for all other DODCH images
                if (img.alt.length < 5) {
                    img.alt = 'DODCH Official Luxury Cosmetic Brand Tunisia - Professional Results';
                }
            }
        });
    }
`;

// Inject the method into the class
if (!seoJs.includes('hijackImageAlts')) {
    seoJs = seoJs.replace('runSEO() {', imageHijackLogic + '\n    runSEO() {');
    seoJs = seoJs.replace('this.injectBreadcrumbs();', 'this.injectBreadcrumbs();\n        this.hijackImageAlts();');
}

fs.writeFileSync('seo.js', seoJs);
console.log('Semantic Hijacking Deployed: Problem-solving keywords and Dynamic Image Alt-tags live.');
