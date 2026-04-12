const fs = require('fs');

// 1. Force Sitemap to WebP
let sitemap = fs.readFileSync('sitemap.xml', 'utf8');
sitemap = sitemap.replace(/\.(PNG|jpg|jpeg|png|JPG)/g, '.webp');
fs.writeFileSync('sitemap.xml', sitemap);
console.log('sitemap.xml synchronized with WebP URLs.');

// 2. Enhance seo.js to explicitly define image objects for search snippets
let seoJs = fs.readFileSync('seo.js', 'utf8');

const thumbnailLogic = `
        // Explicit Thumbnail Schema for Search Snippets
        const mainImg = productData.image || "https://dodch.com/IMG_3352.webp";
        const absoluteImg = mainImg.startsWith('http') ? mainImg : 'https://dodch.com/' + mainImg.replace(/^\\//, '');
        
        productData.image = absoluteImg;
        productData.thumbnailUrl = absoluteImg;
        productData.primaryImageOfPage = {
            "@type": "ImageObject",
            "url": absoluteImg,
            "contentUrl": absoluteImg,
            "width": "1200",
            "height": "1200"
        };
`;

// Inject before finalizing productData
if (seoJs.includes('if (productData) {')) {
    seoJs = seoJs.replace('if (productData) {', `if (productData) {\n        ${thumbnailLogic}`);
}

fs.writeFileSync('seo.js', seoJs);
console.log('SEO Schema enhanced with PrimaryImageObject and Absolute URLs.');
