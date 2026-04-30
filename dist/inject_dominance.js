const a=require("fs");let e=a.readFileSync("seo.js","utf8");const i="Cosmetics Tunisia, Luxury Skincare, Hair Treatments, Professional Shampoos, Soins du visage, Masques capillaires, Cosm\xE9tiques Tunisie, \u0639\u0646\u0627\u064A\u0629 \u0628\u0627\u0644\u0634\u0639\u0631, \u0645\u0646\u062A\u062C\u0627\u062A \u062A\u062C\u0645\u064A\u0644 \u062A\u0648\u0646\u0633, \u0633\u064A\u0631\u0648\u0645 \u0644\u0644\u0648\u062C\u0647, \u0634\u0627\u0645\u0628\u0648 \u0637\u0628\u064A\u0639\u064A, \u0623\u0641\u0636\u0644 \u0634\u0627\u0645\u0628\u0648 \u0641\u064A \u062A\u0648\u0646\u0633, soin cheveux tunisie, boutique cosm\xE9tique luxe";e=e.replace(/this\.setMeta\('name', 'keywords', '.*?'\);/,`this.setMeta('name', 'keywords', '${i}');`);const r=["Tunis","Ariana","Ben Arous","Manouba","Sousse","Sfax","Monastir","Hammamet","Bizerte","Gab\xE8s","Gafsa","Kairouan","Tozeur"],o=`
            "name": "DODCH",
            "legalName": "DODCH Luxury Cosmetics & Hair Care",
            "alternateName": ["DODCH Hair Care", "DODCH Cosmetics", "DODCH Skincare", "\u062F\u0648\u062A\u0634 \u0644\u0644\u062A\u062C\u0645\u064A\u0644", "DODCH Tunisia"],
            "url": "https://dodch.com",
            "logo": "https://dodch.com/IMG_3352.webp",
            "image": "https://dodch.com/IMG_3352.webp",
            "description": "DODCH is the golden standard of Mediterranean hair and skincare. Hand-poured in Tunisia. Specialized professional treatments: Glass Glow Shampoo, Silk Therapy Mask, and Advanced HA Face Serums. Cosm\xE9tiques de luxe Tunisie. \u0645\u0646\u062A\u062C\u0627\u062A \u062A\u062C\u0645\u064A\u0644 \u062A\u0648\u0646\u0633\u064A\u0629 \u0641\u0627\u062E\u0631\u0629.",
            "knowsAbout": [
                "Luxury Hair Care", "Skin Care Treatments", "Sulfate-free Shampoos", "Professional Cosmetics Tunisia",
                "Soins capillaires professionnels", "Soins du visage bio", "Masque capillaire \xE0 la soie",
                "\u0639\u0646\u0627\u064A\u0629 \u0628\u0627\u0644\u0634\u0639\u0631 \u062A\u0648\u0646\u0633", "\u0645\u0646\u062A\u062C\u0627\u062A \u062A\u062C\u0645\u064A\u0644 \u0637\u0628\u064A\u0639\u064A\u0629", "\u0639\u0644\u0627\u062C \u062A\u0633\u0627\u0642\u0637 \u0627\u0644\u0634\u0639\u0631", "\u0633\u064A\u0631\u0648\u0645 \u0627\u0644\u0647\u064A\u0627\u0644\u0648\u0631\u0648\u0646\u064A\u0643", "Prickly Pear Seed Oil Tunisia", "Huile de p\xE9pins de figue de barbarie"
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
                ${r.map(s=>`{"@type": "City", "name": "${s}", "addressCountry": "TN"}`).join(`,
                `)}
            ],`;e=e.replace(/"name": "DODCH",[\s\S]*?"areaServed": \{[\s\S]*?\},/,o),a.writeFileSync("seo.js",e),console.log("Dominance Injection Complete: Trilingual keywords and Geographic coverage live.");
