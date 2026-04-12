const fs = require('fs');
let seoJs = fs.readFileSync('seo.js', 'utf8');

// Define the new Merchant-specific Offer fields
const merchantFields = `
                        "url": window.location.href,
                        "hasMerchantReturnPolicy": {
                            "@type": "MerchantReturnPolicy",
                            "applicableCountry": "TN",
                            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
                            "merchantReturnDays": 2,
                            "returnMethod": "https://schema.org/ReturnByMail",
                            "returnFees": "https://schema.org/FreeReturn"
                        },
                        "shippingDetails": {
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
                                    "minValue": 1,
                                    "maxValue": 2,
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
                        },`;

// Target the "url": window.location.href line in the offers block
// We need to be careful with the comma and the trailing closing braces
seoJs = seoJs.replace('"url": window.location.href,', merchantFields);

fs.writeFileSync('seo.js', seoJs);
console.log('SEO.js updated with Merchant Shipping and Return policies.');
