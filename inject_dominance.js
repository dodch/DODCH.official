const fs = require('fs');
let seoJs = fs.readFileSync('seo.js', 'utf8');

// 1. Enhance injectBaseMeta with Trilingual Dominance
const triKeywords = 'Cosmetics Tunisia, Luxury Skincare, Hair Treatments, Professional Shampoos, Soins du visage, Masques capillaires, Cosmétiques Tunisie, عناية بالشعر, منتجات تجميل تونس, سيروم للوجه, شامبو طبيعي, أفضل شامبو في تونس, soin cheveux tunisie, boutique cosmétique luxe';
seoJs = seoJs.replace(/this\.setMeta\('name', 'keywords', '.*?'\);/, `this.setMeta('name', 'keywords', '${triKeywords}');`);

// 2. Enhance injectGlobalSchema with Geographic Dominance (Tunisia regions)
const geoRegions = [
    "Tunis", "Ariana", "Ben Arous", "Manouba", "Sousse", "Sfax", "Monastir", "Hammamet", "Bizerte", "Gabès", "Gafsa", "Kairouan", "Tozeur"
];
const updatedOrgSchema = `
            "name": "DODCH",
            "legalName": "DODCH Luxury Cosmetics & Hair Care",
            "alternateName": ["DODCH Hair Care", "DODCH Cosmetics", "DODCH Skincare", "دوتش للتجميل", "DODCH Tunisia"],
            "url": "https://dodch.com",
            "logo": "https://dodch.com/IMG_3352.webp",
            "image": "https://dodch.com/IMG_3352.webp",
            "description": "DODCH is the golden standard of Mediterranean hair and skincare. Hand-poured in Tunisia. Specialized professional treatments: Glass Glow Shampoo, Silk Therapy Mask, and Advanced HA Face Serums. Cosmétiques de luxe Tunisie. منتجات تجميل تونسية فاخرة.",
            "knowsAbout": [
                "Luxury Hair Care", "Skin Care Treatments", "Sulfate-free Shampoos", "Professional Cosmetics Tunisia",
                "Soins capillaires professionnels", "Soins du visage bio", "Masque capillaire à la soie",
                "عناية بالشعر تونس", "منتجات تجميل طبيعية", "علاج تساقط الشعر", "سيروم الهيالورونيك", "Prickly Pear Seed Oil Tunisia", "Huile de pépins de figue de barbarie"
            ],
            "location": {
                "@type": "Place",
                "name": "DODCH Tunisia HQ",
                "address": {
                    "@type": "PostalAddress",
                    "addressCountry": "TN",
                    "addressLocality": "Tunis",
                    "addressRegion": "Tunisia"
                }
            },
            "hasOfferCatalog": {
                "@type": "OfferCatalog",
                "name": "DODCH Collection",
                "itemListElement": [
                   { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Luxury Hair Care Tunisia" } },
                   { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Premium Skincare Tunisia" } }
                ]
            },
            "areaServed": [
                ${geoRegions.map(r => `{"@type": "City", "name": "${r}", "addressCountry": "TN"}`).join(',\n                ')}
            ],`;

// Inject geographic dominance into the organization schema block
seoJs = seoJs.replace(/"name": "DODCH",[\s\S]*?"areaServed": \{[\s\S]*?\},/, updatedOrgSchema);

fs.writeFileSync('seo.js', seoJs);
console.log('Dominance Injection Complete: Trilingual keywords and Geographic coverage live.');
