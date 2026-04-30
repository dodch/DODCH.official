const e=require("fs");let a=e.readFileSync("sitemap.xml","utf8");a=a.replace(/\.(PNG|jpg|jpeg|png|JPG)/g,".webp"),e.writeFileSync("sitemap.xml",a),console.log("sitemap.xml synchronized with WebP URLs.");let t=e.readFileSync("seo.js","utf8");const i=`
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
`;t.includes("if (productData) {")&&(t=t.replace("if (productData) {",`if (productData) {
        ${i}`)),e.writeFileSync("seo.js",t),console.log("SEO Schema enhanced with PrimaryImageObject and Absolute URLs.");
