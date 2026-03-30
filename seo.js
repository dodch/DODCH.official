/**
 * DODCH Dynamic SEO Enhancer
 * Automatically injects and updates Schema.org structured data and open graph tags.
 */

class DynamicSEO {
    constructor() {
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.runSEO());
        } else {
            this.runSEO();
        }
    }

    runSEO() {
        this.injectBaseMeta();
        this.injectGlobalSchema();
        this.enhanceProductSchema();
        this.setupReviewObserver();
        this.injectFAQs();
        this.injectBreadcrumbs();
    }

    injectBaseMeta() {
        const title = document.title;
        const descriptionNode = document.querySelector('meta[name="description"]');
        const originalDescription = descriptionNode ? descriptionNode.content : '';
        
        // Poly-Semantic Trilingual Description
        const enrichedDescription = `${originalDescription} — Luxury Cosmetics Tunisia. Cosmétiques de luxe et soins capillaires professionnels. منتجات تجميل فاخرة وعناية بالشعر في تونس.`;

        // Open Graph
        this.setMeta('property', 'og:type', 'website');
        this.setMeta('property', 'og:title', title);
        this.setMeta('property', 'og:description', enrichedDescription);
        this.setMeta('property', 'og:url', window.location.href);

        // Twitter
        this.setMeta('name', 'twitter:card', 'summary_large_image');
        this.setMeta('name', 'twitter:title', title);
        this.setMeta('name', 'twitter:description', enrichedDescription);
        this.setMeta('name', 'description', enrichedDescription);

        // Keywords for multi-lingual reach
        this.setMeta('name', 'keywords', 'Cosmetics Tunisia, Luxury Skincare, Hair Treatments, Professional Shampoos, Soins du visage, Masques capillaires, Cosmétiques Tunisie, عناية بالشعر, منتجات تجميل تونس, سيروم للوجه, شامبو طبيعي');

        // Try to find the main image for og:image
        let ogImageNode = document.querySelector('meta[property="og:image"]');
        if (!ogImageNode) {
            let img = document.querySelector('.overview-image img, .hero-content img, .img-frame-img, .product-hero-img');
            let imgUrl = img && img.src ? img.src : `${this.baseUrl}/IMG_3352.PNG`;
            this.setMeta('property', 'og:image', imgUrl);
            this.setMeta('name', 'twitter:image', imgUrl);
        }
    }

    setMeta(attrName, attrValue, content) {
        if (!content) return;
        let meta = document.querySelector(`meta[${attrName}="${attrValue}"]`);
        if (!meta) {
            meta = document.createElement('meta');
            meta.setAttribute(attrName, attrValue);
            document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
    }

    injectGlobalSchema() {
        // Collect existing social links from the DOM
        const socialNodes = document.querySelectorAll('a[href*="instagram.com"], a[href*="tiktok.com"], a[href*="facebook.com"]');
        const sameAs = Array.from(socialNodes).map(a => a.href).filter((value, index, self) => self.indexOf(value) === index);

        const organizationSchema = {
            "@context": "https://schema.org",
            "@type": "HealthAndBeautyBusiness",
            "name": "DODCH",
            "legalName": "DODCH Luxury Cosmetics & Hair Care",
            "alternateName": ["DODCH Hair Care", "DODCH Cosmetics", "DODCH Skincare", "دوتش للتجميل"],
            "url": "https://dodch.com",
            "logo": "https://dodch.com/IMG_3352.PNG",
            "image": "https://dodch.com/IMG_3352.PNG",
            "description": "DODCH is a luxury hair care and cosmetics brand based in Tunisia. Specialized professional treatments: Glass Glow Shampoo, Silk Therapy Mask, and Advanced HA Face Serums. Cosmétiques de luxe Tunisie. منتجات تجميل تونسية فاخرة.",
            "knowsAbout": [
                "Luxury Hair Care", "Skin Care Treatments", "Sulfate-free Shampoos", "Professional Cosmetics Tunisia",
                "Soins capillaires professionnels", "Soins du visage bio", "Masque capillaire à la soie",
                "عناية بالشعر تونس", "منتجات تجميل طبيعية", "علاج تساقط الشعر", "سيروم الهيالورونيك"
            ],
            "areaServed": {
                "@type": "Country",
                "name": "Tunisia"
            },
            "priceRange": "$$",
            "address": {
                "@type": "PostalAddress",
                "addressCountry": "TN",
                "addressLocality": "Tunis",
                "addressRegion": "Tunisia"
            },
            "sameAs": sameAs,
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "",
                "contactType": "customer service"
            }
        };

        const websiteSchema = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "DODCH",
            "url": "https://dodch.com",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://dodch.com/shop?q={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        };

        this.updateOrInjectSchema('Organization', organizationSchema);
        this.updateOrInjectSchema('WebSite', websiteSchema);
    }

    enhanceProductSchema() {
        // Look for existing product schema to enrich it
        const schemas = document.querySelectorAll('script[type="application/ld+json"]');
        let productSchemaNode = null;
        let productData = null;

        schemas.forEach(s => {
            try {
                const data = JSON.parse(s.innerHTML);
                if (data['@type'] === 'Product') {
                    productSchemaNode = s;
                    productData = data;
                }
            } catch (e) {}
        });

        // Dynamic scraping for Product schema if it doesn't already exist
        if (!productData) {
            const titleEl = document.querySelector('h1, h2.product-title, #product-title');
            // Ensure we are actually on a product page by checking for typical elements
            const priceEl = document.querySelector('.product-price, .price, #product-price');
            
            if (titleEl && priceEl && !document.title.includes('FAQ')) {
                const imgEl = document.querySelector('.overview-image img, .hero-content img, .img-frame-img, .product-hero-img, #main-product-image');
                const descEl = document.querySelector('meta[name="description"]');
                
                let priceValue = "0.00";
                if (priceEl && priceEl.textContent) {
                    // Extract numeric price, ignoring text like " TND" or "Out of Stock"
                    const match = priceEl.textContent.replace(/,/g, '').match(/\d+(\.\d+)?/);
                    if (match) priceValue = match[0];
                }

                // Determine stock availability
                let availability = "https://schema.org/InStock";
                if (priceEl && priceEl.textContent.toLowerCase().includes("out of stock")) {
                    availability = "https://schema.org/OutOfStock";
                }

                productData = {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": titleEl.textContent.trim(),
                    "image": imgEl ? imgEl.src : "https://dodch.com/IMG_3352.PNG",
                    "description": descEl ? descEl.content : document.title,
                    "offers": {
                        "@type": "Offer",
                        "priceCurrency": "TND",
                        "price": priceValue,
                        "itemCondition": "https://schema.org/NewCondition",
                        "availability": availability,
                        "url": window.location.href,
                        "seller": {
                            "@type": "Organization",
                            "name": "DODCH"
                        }
                    }
                };
            }
        }

        if (productData) {
            // Trilingual Category Enrichment
            const name = productData.name.toLowerCase();
            let trilingualCategories = [];
            
            if (name.includes('shampoo') || name.includes('shampoing') || name.includes('شامبو')) {
                trilingualCategories = ["Luxury Shampoo", "Shampooing sans sulfate", "شامبو طبيعي", "Hair Care Tunisia"];
            } else if (name.includes('mask') || name.includes('masque') || name.includes('ماسك')) {
                trilingualCategories = ["Hair Repair Treatment", "Masque capillaire à la soie", "ماسك شعر", "Silk Therapy"];
            } else if (name.includes('serum') || name.includes('sérum') || name.includes('سيروم')) {
                trilingualCategories = ["Face Treatment", "Sérum acide hyaluronique", "سيروم للوجه", "Advanced Skincare"];
            } else if (name.includes('cleanser') || name.includes('nettoyant') || name.includes('منظف')) {
                trilingualCategories = ["Gentle Cleanser", "Nettoyant visage", "منظف وجه", "Luminous Skin"];
            }

            productData.category = trilingualCategories.join(', ');
            productData.brand = {
                "@type": "Brand",
                "name": "DODCH",
                "logo": "https://dodch.com/IMG_3352.PNG"
            };

            this.currentProductData = productData;
            
            if (productSchemaNode) {
                this.currentProductSchemaNode = productSchemaNode;
            } else {
                // We generated the schema dynamically, inject it
                this.updateOrInjectSchema('Product', productData);
            }
        }
    }

    setupReviewObserver() {
        const reviewsContainer = document.getElementById('product-reviews-container');
        if (!reviewsContainer) return;

        // Observe changes to the reviews container to dynamically calculate AggregateRating
        const observer = new MutationObserver(() => this.calculateAndInjectRatings(reviewsContainer));
        observer.observe(reviewsContainer, { childList: true, subtree: true });
        
        // Initial calc
        this.calculateAndInjectRatings(reviewsContainer);
    }

    calculateAndInjectRatings(container) {
        if (!this.currentProductData) return;

        // Try to extract reviews, DODCH uses .review-card potentially (or we search for stars)
        const reviewElements = container.querySelectorAll('.review-card');
        if (reviewElements.length === 0) return;

        let totalScore = 0;
        let validReviewsCount = 0;
        let reviewMocks = [];

        reviewElements.forEach(el => {
            // Usually stars are in a container like .stars
            const starsText = el.textContent || '';
            const starsMatch = starsText.match(/★/g);
            const score = starsMatch ? starsMatch.length : 0;
            if (score > 0 && score <= 5) {
                totalScore += score;
                validReviewsCount++;

                reviewMocks.push({
                    "@type": "Review",
                    "reviewRating": {
                        "@type": "Rating",
                        "ratingValue": score,
                        "bestRating": "5"
                    },
                    "author": {
                        "@type": "Person",
                        "name": "Verified Buyer"
                    }
                });
            }
        });

        if (validReviewsCount > 0) {
            const average = (totalScore / validReviewsCount).toFixed(1);
            
            // Enrich schema
            this.currentProductData.aggregateRating = {
                "@type": "AggregateRating",
                "ratingValue": average,
                "reviewCount": validReviewsCount
            };
            this.currentProductData.review = reviewMocks;

            // Update DOM
            this.currentProductSchemaNode.innerHTML = JSON.stringify(this.currentProductData, null, 2);
        }
    }

    updateOrInjectSchema(type, data) {
        const schemas = document.querySelectorAll('script[type="application/ld+json"]');
        let injected = false;
        schemas.forEach(s => {
            try {
                const json = JSON.parse(s.innerHTML);
                if (json['@type'] === type) {
                    s.innerHTML = JSON.stringify(data, null, 2);
                    injected = true;
                }
            } catch (e) {}
        });

        if (!injected) {
            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.innerHTML = JSON.stringify(data, null, 2);
            document.head.appendChild(script);
        }
    }

    injectFAQs() {
        // Look for h3 question and p answer patterns
        const questionElements = document.querySelectorAll('h3');
        if (questionElements.length === 0) return;

        let faqEntities = [];
        questionElements.forEach(h3 => {
            const questionText = h3.textContent.trim();
            // A heuristic for a question: ends with ?, or is on the FAQ page
            if (questionText.endsWith('?') || window.location.pathname.includes('faq')) {
                const p = h3.nextElementSibling;
                if (p && p.tagName.toLowerCase() === 'p') {
                    faqEntities.push({
                        "@type": "Question",
                        "name": questionText,
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": p.textContent.trim()
                        }
                    });
                }
            }
        });

        if (faqEntities.length > 0) {
            const faqSchema = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": faqEntities
            };
            this.updateOrInjectSchema('FAQPage', faqSchema);
        }
    }

    injectBreadcrumbs() {
        const path = window.location.pathname;
        const pageName = document.title.split('|')[0].trim();
        
        let itemListElement = [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": this.baseUrl + "/"
            }
        ];

        // Ensure we don't build breadcrumbs for homepage
        if (path !== '/' && !path.includes('index.html')) {
            let categoryName = "Products";
            
            // Infer category purely from title heuristics to map nicely
            if (pageName.toLowerCase().includes('serum') || pageName.toLowerCase().includes('foam') || pageName.toLowerCase().includes('cleanser')) {
                categoryName = "Skin Care";
            } else if (pageName.toLowerCase().includes('shampoo') || pageName.toLowerCase().includes('mask') || pageName.toLowerCase().includes('pro-v') || pageName.toLowerCase().includes('therapy')) {
                categoryName = "Hair Care";
            } else if (pageName.toLowerCase().includes('faq') || pageName.toLowerCase().includes('about')) {
                categoryName = "Company";
            }

            itemListElement.push({
                "@type": "ListItem",
                "position": 2,
                "name": categoryName,
                "item": this.baseUrl + "/#shop"
            });

            itemListElement.push({
                "@type": "ListItem",
                "position": 3,
                "name": pageName,
                "item": window.location.href
            });
        } else {
            // Homepage is just root
            return;
        }

        const breadcrumbSchema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": itemListElement
        };

        this.updateOrInjectSchema('BreadcrumbList', breadcrumbSchema);
    }
}

new DynamicSEO();
export default DynamicSEO;
