const fs = require('fs');
let seoJs = fs.readFileSync('seo.js', 'utf8');

// 1. Add "Brand Defense" logic to injectGlobalSchema
const brandDefense = `
            "brand": {
                "@type": "Brand",
                "name": "DODCH",
                "alternateName": "DODCH Luxury",
                "description": "DODCH (pronounced 'DODCH') is a unique luxury cosmetics trademark from Tunisia. Not associated with other similarly named brands."
            },
            "disambiguatingDescription": "Premium Hair & Skincare Brand hand-poured in Tunisia. Golden Standard of Mediterranean beauty.",`;

// Inject into the HealthAndBeautyBusiness block
seoJs = seoJs.replace('"legalName": "DODCH Luxury Cosmetics & Hair Care",', `"legalName": "DODCH Luxury Cosmetics & Hair Care",\n            ${brandDefense}`);

// 2. Enhance Page Titles globally in the code (adding "Official Store" to prevent confusion)
const officialSuffix = " | Official DODCH® Store Tunisia";
seoJs = seoJs.replace('const title = document.title;', `let title = document.title; if(!title.includes('Official')) title += '${officialSuffix}'; document.title = title;`);

fs.writeFileSync('seo.js', seoJs);
console.log('Brand Defense Active: Unique Brand Schema and Official Suffixes deployed.');
