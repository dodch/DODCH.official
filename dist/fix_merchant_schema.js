const t=require("fs");let e=t.readFileSync("seo.js","utf8");const i=`
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
                        },`;e=e.replace('"url": window.location.href,',i),t.writeFileSync("seo.js",e),console.log("SEO.js updated with Merchant Shipping and Return policies.");
