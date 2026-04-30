/**
 * DODCH Dynamic SEO Enhancer
 * Automatically injects and updates Schema.org structured data and open graph tags.
 */

class DynamicSEO {
    constructor() {
        this.baseUrl = 'https://dodch.com';
        this.currentProductData = null;
        this.currentProductSchemaNode = null;
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

    hijackImageAlts() {
        const productMapping = {
            'shampoo': 'Luxury Sulfate-Free Glass Glow Shampoo Tunisia - Best for Shine and Repair',
            'mellow': 'DODCHmellow Cloud Shampoo - Ultra Soft Lather for Sensitive Scalp',
            'mask': 'Silk Therapy Hair Mask Tunisia - Professional Damage Repair After Result',
            'serum': 'Advanced HA Face Serum Tunisia - Immediate Plumping and Hydration Result',
            'cleanser': 'Gentle Foaming Face Cleanser Tunisia - Pore Refining and Luminous Skin'
        };

        const images = document.querySelectorAll('img');
        images.forEach(img => {
            const src = img.src.toLowerCase();
            const alt = img.alt ? img.alt.toLowerCase() : '';
            
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

    runSEO() {
        this.injectBaseMeta();
        this.injectGlobalSchema();
        this.enhanceProductSchema();
        this.setupReviewObserver();
        this.injectFAQs();
        this.injectBreadcrumbs();
        this.hijackImageAlts();
    }

    injectBaseMeta() {
        let title = document.title; 
        if(!title.includes('Official')) title += ' | Official DODCH® Store Tunisia'; 
        document.title = title;
        
        const descriptionNode = document.querySelector('meta[name="description"]');
        const originalDescription = descriptionNode ? descriptionNode.content : '';
        
        // Poly-Semantic Trilingual Description
        const enrichedDescription = `${originalDescription} — Luxury Cosmetics Tunisia. Cosmétiques de luxe et soins capillaires professionnels. منتجات تجميل فاخرة وعناية بالشعر في تونس.`;

        // Open Graph Base
        this.setMeta('property', 'og:type', 'website');
        this.setMeta('property', 'og:title', title);
        this.setMeta('property', 'og:description', enrichedDescription);
        this.setMeta('property', 'og:url', window.location.href);

        // Twitter Base
        this.setMeta('name', 'twitter:card', 'summary_large_image');
        this.setMeta('name', 'twitter:title', title);
        this.setMeta('name', 'twitter:description', enrichedDescription);
        this.setMeta('name', 'description', enrichedDescription);

        // Keywords for multi-lingual reach
        this.setMeta('name', 'keywords', 'best shampoo for frizzy hair Tunisia, treatment for damaged hair, sulfate free shampoo results, hair growth serum Tunisia, organic face cleanser, anti-aging hyaluronic acid serum, clear skin routine Tunisia, luxe hair care review, professional shampoo alternative, أفضل شامبو لتساقط الشعر, علاج تقصف الشعر تونسي, روتين البشرة الدهنية');

        // Dynamic Image Fallback
        let ogImageNode = document.querySelector('meta[property="og:image"]');
        if (!ogImageNode || ogImageNode.content.includes('IMG_3352.webp')) {
            let img = document.querySelector('.overview-image img, .hero-content img, .img-frame-img, .product-hero-img, video[poster]');
            let imgUrl = '';
            
            if (img) {
                if (img.tagName.toLowerCase() === 'video') {
                    imgUrl = img.getAttribute('poster');
                } else {
                    imgUrl = img.src;
                }
            }
            
            if (imgUrl) {
                const absoluteUrl = imgUrl.startsWith('http') ? imgUrl : `${this.baseUrl}/${imgUrl.replace(/^\//, '')}`;
                this.setMeta('property', 'og:image', absoluteUrl);
                this.setMeta('name', 'twitter:image', absoluteUrl);
            }
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
        // 1. Organization Schema
        const globalData = {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "DODCH",
            "url": "https://dodch.com",
            "logo": "https://dodch.com/IMG_3352.webp",
            "sameAs": [
                "https://www.instagram.com/dodch.official/",
                "https://www.facebook.com/dodch.official"
            ],
            "contactPoint": {
                "@type": "ContactPoint",
                "telephone": "+216-XX-XXX-XXX",
                "contactType": "customer service",
                "areaServed": "TN",
                "availableLanguage": ["Arabic", "French", "English"]
            }
        };
        this.updateOrInjectSchema('Organization', globalData);

        // 2. WebSite Schema (with Search Action)
        const websiteData = {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "DODCH",
            "url": "https://dodch.com",
            "potentialAction": {
                "@type": "SearchAction",
                "target": "https://dodch.com/index.html?search={search_term_string}",
                "query-input": "required name=search_term_string"
            }
        };
        this.updateOrInjectSchema('WebSite', websiteData);
    }

    enhanceProductSchema() {
        const productSchemaNode = document.querySelector('script[type="application/ld+json"]');
        if (!productSchemaNode) return;

        let productData = null;
        try {
            const json = JSON.parse(productSchemaNode.innerHTML);
            if (json['@type'] === 'Product') {
                productData = json;
            }
        } catch (e) {}

        if (productData) {
            this.currentProductData = productData;
            
            // 1. Force Absolute Image URL
            if (productData.image && !productData.image.startsWith('http')) {
                productData.image = `${this.baseUrl}/${productData.image.replace(/^\//, '')}`;
            }

            // 2. Add Brand Data
            productData.brand = {
                "@type": "Brand",
                "name": "DODCH",
                "logo": "https://dodch.com/IMG_3352.webp"
            };

            // 3. Add Google Merchant Center required fields (Shipping & Returns)
            if (productData.offers) {
                const offers = Array.isArray(productData.offers) ? productData.offers[0] : productData.offers;
                
                // Dynamic Stock Detection (from fix_stock_schema.js)
                let availability = "https://schema.org/InStock";
                const outOfStockEl = document.querySelector('.out-of-stock, .product-badge.out-of-stock, .stock-status.out');
                const priceEl = document.querySelector('.product-price');
                if (outOfStockEl || (priceEl && priceEl.textContent.toLowerCase().includes("out of stock"))) {
                    availability = "https://schema.org/OutOfStock";
                }
                offers.availability = availability;

                // Absolute URL for the offer
                offers.url = window.location.href;

                // Return Policy
                offers.hasMerchantReturnPolicy = {
                    "@type": "MerchantReturnPolicy",
                    "applicableCountry": "TN",
                    "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                    "merchantReturnDays": 14,
                    "returnMethod": "https://schema.org/ReturnByMail",
                    "returnFees": "https://schema.org/FreeReturn"
                };

                // Shipping Details
                offers.shippingDetails = {
                    "@type": "OfferShippingDetails",
                    "shippingRate": {
                        "@type": "MonetaryAmount",
                        "value": 7.00,
                        "currency": "TND"
                    },
                    "deliveryTime": {
                        "@type": "ShippingDeliveryTime",
                        "handlingTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 0,
                            "maxValue": 1,
                            "unitCode": "DAY"
                        },
                        "transitTime": {
                            "@type": "QuantitativeValue",
                            "minValue": 1,
                            "maxValue": 3,
                            "unitCode": "DAY"
                        }
                    },
                    "shippingDestination": {
                        "@type": "DefinedRegion",
                        "addressCountry": "TN"
                    }
                };
            }

            // 4. Add trilingual category info
            const titleLower = document.title.toLowerCase();
            if (titleLower.includes('shampoo')) productData.category = "Hair Care > Shampoos | Soins capillaires > Shampoings | العناية بالشعر > شامبو";
            else if (titleLower.includes('mask')) productData.category = "Hair Care > Masks | Soins capillaires > Masques | العناية بالشعر > أقنعة";
            else if (titleLower.includes('serum')) productData.category = "Skin Care > Serums | Soins du visage > Sérums | العناية بالبشرة > سيروم";
            else if (titleLower.includes('cleanser')) productData.category = "Skin Care > Cleansers | Soins du visage > Nettoyants | العناية بالبشرة > منظف";

            // Update node
            if (productSchemaNode) {
                this.currentProductSchemaNode = productSchemaNode;
                productSchemaNode.innerHTML = JSON.stringify(productData, null, 2);
            } else {
                this.currentProductSchemaNode = this.updateOrInjectSchema('Product', productData);
            }
        }
    }

    setupReviewObserver() {
        const reviewsContainer = document.getElementById('product-reviews-container');
        if (!reviewsContainer) return;

        const observer = new MutationObserver(() => this.calculateAndInjectRatings(reviewsContainer));
        observer.observe(reviewsContainer, { childList: true, subtree: true });
        this.calculateAndInjectRatings(reviewsContainer);
    }

    calculateAndInjectRatings(container) {
        if (!this.currentProductData || !this.currentProductSchemaNode) return;

        const reviewElements = container.querySelectorAll('.review-card');
        if (reviewElements.length === 0) return;

        let totalScore = 0;
        let validReviewsCount = 0;
        let reviewMocks = [];

        reviewElements.forEach(el => {
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
            this.currentProductData.aggregateRating = {
                "@type": "AggregateRating",
                "ratingValue": average,
                "reviewCount": validReviewsCount
            };
            this.currentProductData.review = reviewMocks;
            this.currentProductSchemaNode.innerHTML = JSON.stringify(this.currentProductData, null, 2);
        }
    }

    updateOrInjectSchema(type, data) {
        const schemas = document.querySelectorAll('script[type="application/ld+json"]');
        let node = null;
        schemas.forEach(s => {
            try {
                const json = JSON.parse(s.innerHTML);
                if (json['@type'] === type) {
                    s.innerHTML = JSON.stringify(data, null, 2);
                    node = s;
                }
            } catch (e) {}
        });

        if (!node) {
            node = document.createElement('script');
            node.type = 'application/ld+json';
            node.innerHTML = JSON.stringify(data, null, 2);
            document.head.appendChild(node);
        }
        return node;
    }

    injectFAQs() {
        const faqSection = document.getElementById('faq') || document.querySelector('.faq-section');
        if (!faqSection) return;

        const questions = [];
        const questionElements = faqSection.querySelectorAll('h3, .faq-question');
        questionElements.forEach(h3 => {
            const questionText = h3.textContent.trim();
            if (questionText.endsWith('?') || window.location.pathname.includes('faq')) {
                const p = h3.nextElementSibling;
                if (p && p.tagName.toLowerCase() === 'p') {
                    questions.push({
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

        if (questions.length > 0) {
            const faqData = {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": questions
            };
            this.updateOrInjectSchema('FAQPage', faqData);
        }
    }

    injectBreadcrumbs() {
        const path = window.location.pathname.split('/').filter(p => p);
        const crumbs = [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": this.baseUrl
            }
        ];

        let currentPath = this.baseUrl;
        path.forEach((p, index) => {
            currentPath += `/${p}`;
            let name = p.replace('.html', '').split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            crumbs.push({
                "@type": "ListItem",
                "position": index + 2,
                "name": name,
                "item": currentPath
            });
        });

        if (crumbs.length > 1) {
            const breadcrumbData = {
                "@context": "https://schema.org",
                "@type": "BreadcrumbList",
                "itemListElement": crumbs
            };
            this.updateOrInjectSchema('BreadcrumbList', breadcrumbData);
        }
    }
}

// Auto-run
window.dodchSEO = new DynamicSEO();
export default DynamicSEO;
