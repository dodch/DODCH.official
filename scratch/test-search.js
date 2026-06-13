const SEARCH_SYNONYMS = {
    'shampoo': ['shampoing', 'شامبو', 'shampoo'],
    'oil': ['huile', 'زيت', 'oil', 'elixir', 'drops', 'gouttes', 'قطرات'],
    'serum': ['سيروم', 'concentre', 'serum', 'booster', 'ampoule', 'essence'],
    'mask': ['masque', 'قناع', 'mask', 'wrap'],
    'pear': ['figue', 'صبار', 'barbarie', 'prickly', 'cactus', 'pear'],
    'fig': ['figue', 'صبار', 'barbarie', 'fig'],
    'silk': ['soie', 'حرير', 'silk'],
    'glow': ['eclat', 'اللمعان', 'bright', 'shine', 'radiant', 'brillance', 'glow'],
    'face': ['visage', 'وجه', 'face'],
    'body': ['corps', 'جسم', 'body'],
    'hair': ['cheveux', 'شعر', 'hair'],
    'cleanser': ['wash', 'cleaning', 'cleanser', 'nettoyant', 'غسول', 'cleansing'],
    'skin': ['skin', 'peau', 'بشرة']
};

const SEARCH_INTENTS = {
    'needs_hydration': ['dry', 'dehydrated', 'thirsty', 'brittle', 'جاف', 'عطشان', 'sec', 'deshydrate', 'moisture', 'hydratation', 'ترطيب', 'ashy', 'flakey'],
    'needs_repair': ['damaged', 'breakage', 'split ends', 'weak', 'تالف', 'مكسر', 'abime', 'casse', 'repair', 'reparer', 'اصلاح', 'fragile', 'weakness'],
    'wants_luxury': ['premium', 'luxury', 'exclusive', 'best', 'فاخر', 'راقي', 'luxe', 'precieux', 'high-end', 'expensive', 'gold', 'or'],
    'wants_scent': ['smell', 'scent', 'fragrance', 'perfume', 'neroli', 'flower', 'رائحة', 'عطر', 'parfum', 'fleur', 'sweet', 'sucre', 'odeur'],
    'wants_growth': ['grow', 'loss', 'thinning', 'volume', 'chute', 'pousse', 'تساقط', 'نمو', 'thick', 'density'],
    'wants_smooth': ['frizz', 'frizzy', 'tangle', 'smooth', 'frisottis', 'lisse', 'tame', 'مجعد', 'ناعم', 'detangle', 'demelant'],
    'wants_antiaging': ['wrinkle', 'aging', 'youth', 'rides', 'anti-age', 'تجاعيد', 'شيخوخة', 'firm', 'lift', 'fermete']
}; 

const SITE_SEO_KNOWLEDGE = {
    'shampoo': [
        'sulfate-free', 'sans sulfate', 'خالي من السلفات', 'color-safe', 'daily use', 'usage quotidien', 'استخدام يومي',
        'cleansing', 'scalp care', 'purifying', 'purifiant', 'تطهير', 'mellow', 'marshmallow', 'guimauve'
    ],
    'mask': [
        'deep conditioning', 'soin profond', 'عناية عميقة', 'protein', 'keratin', 'ceramides', '10 minutes',
        'overnight', 'nuit', 'leave-in', 'sans rincage', 'بدون غسل', 'revitalize', 'revitalisant'
    ],
    'serum': [
        'hyaluronic', 'vitamin c', 'niacinamide', 'glass skin', 'peau de verre', 'بشرة زجاجية', 'fast-absorbing',
        'absorbtion rapide', 'سريع الامتصاص', 'lightweight', 'leger', 'خفيف', 'youth booster'
    ],
    'oil': [
        'argan', 'jojoba', 'vitamin e', 'anti-oxidant', 'antioxydant', 'مضاد اكسدة', 'pure', 'cold-pressed',
        'pressee a froid', 'عصرة باردة', 'multipurpose', 'multi-usages', 'متعدد الاستخدامات', 'nail cuticles', 'cuticules', 'beard', 'barbe'
    ]
};

const defaultProductCatalog = {
    'glass-glow-shampoo': {
        name: "Glass Glow Shampoo",
        category: "hair-care",
        subCategory: "shampoo",
        subtitle: "The Elixir of 10,000 Seeds",
        description: "THIS PRODUCT IS NO LONGER AVAILABLE. Experience the legacy of our original Glass Glow formula. While this specific treatment has been retired from our permanent collection, its spirit lives on in our newer innovations."
    },
    'dodchmellow-pro-v': {
        name: "DODCHmellow",
        category: "hair-care",
        subCategory: "shampoo",
        subtitle: "The Marshmallow Cloud Shampoo",
        description: "Imagine a lather so dense and soft it feels like a whipped cloud. Sulfate-Free | Silk-Polymer Infusion | pH 5.5. Fragrance: Néroli-Sucre."
    },
    'foaming-cleanser': {
        name: "DODCH Foaming Cleanser",
        category: "skin-care",
        subCategory: "cleansers",
        subtitle: "Luminous Purity",
        description: "A gentle yet powerful daily cleanser with AHA + BHA exfoliation, hydrating Panthenol & Glycerin, and soothing Allantoin."
    },
    'silk-therapy-mask': {
        name: "DODCH Pro-V Silk Therapy Mask",
        category: "hair-care",
        subCategory: ["masks", "conditioners", "leave-in"],
        subtitle: "Deep Repair & Glass Shine",
        description: "Infused with Pro-Vitamin B5 and hydrolyzed silk for deep conditioning, hydration, and strength. Use as a rinse-off mask or lightweight leave-in for silky, frizz-free hair."
    },
    'advanced-ha-serum': {
        name: "Advanced HA Serum",
        category: "skin-care",
        subCategory: "serums",
        subtitle: "Radiance & Deep Hydration",
        description: "A concentrated Hyaluronic Acid serum that penetrates deep layers for instant plumping and long-lasting hydration."
    },
    'retinol-night-cream': {
        name: "0.5 Retinol Night Cream",
        category: "skin-care",
        subCategory: "creams",
        subtitle: "Youth Renewing Overnight Treatment",
        description: "A powerful overnight cream formulated with 0.5% active retinol to visibly reduce fine lines, refine skin texture, and promote a radiant, youthful complexion."
    },
    'sooth-repair': {
        name: "DODCH Sooth & Repair",
        category: "skin-care",
        subCategory: "creams",
        subtitle: "Intensive Barrier Recovery",
        description: "An intensive recovery treatment designed to soothe inflammation and repair the skin barrier. Formulated with Mediterranean botanicals to restore radiance to stressed skin."
    }
};

class DODCHSearchEngine {
    constructor() {
        this.catalog = {};
        this.index = [];
    }
    normalize(str) {
        if (!str) return '';
        return str.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove French accents
            .replace(/[آأإا]/g, 'ا') // Normalize Arabic Alef
            .replace(/ة/g, 'ه')     // Normalize Arabic Tehmabuta
            .replace(/ى/g, 'ي')     // Normalize Arabic Alef Maksura
            .trim();
    }
    init(catalog) {
        this.catalog = catalog;
        this.index = Object.entries(catalog).map(([id, item]) => {
            let tags = (item.tags || []).map(t => this.normalize(t));
            const synonyms = [];
            
            // Build allText including subCategory
            const subCatText = Array.isArray(item.subCategory) 
                ? item.subCategory.join(' ') 
                : (item.subCategory || '');
            const allText = (item.name + ' ' + (item.category || '') + ' ' + subCatText).toLowerCase();

            for (const [key, list] of Object.entries(SEARCH_SYNONYMS)) {
                if (allText.includes(key) || list.some(l => allText.includes(l))) {
                    synonyms.push(...list, key);
                }
            }
            const seoTags = [];
            for (const [category, knowledgeList] of Object.entries(SITE_SEO_KNOWLEDGE)) {
                if (allText.includes(category)) {
                    seoTags.push(...knowledgeList.map(k => this.normalize(k)));
                }
            }
            if (allText.includes('shampoo') || allText.includes('mask')) {
                tags.push('needs_hydration', 'needs_repair', 'wants_smooth');
            }
            if (allText.includes('shampoo')) {
                tags.push('wants_scent');
            }
            if (allText.includes('serum') || allText.includes('oil')) {
                tags.push('wants_antiaging', 'wants_glow', 'needs_repair');
            }

            const indexItem = {
                id: id,
                name: this.normalize(item.name),
                category: this.normalize(item.category || ''),
                description: this.normalize(item.description || ''),
                tags: [...new Set([...tags, ...synonyms, ...seoTags])],
                price: item.price,
                scrapedText: '' // Simulated
            };
            return indexItem;
        });
    }
    levenshtein(a, b) {
        const matrix = [];
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }
    isFuzzyMatch(token, targetString) {
        if (targetString.includes(token)) return true;
        const threshold = token.length > 6 ? 2 : 1;

        if (token.length > 3) {
            const words = targetString.split(/\s+/);
            for (let word of words) {
                if (word.length > 3 && this.levenshtein(token, word) <= threshold) {
                    return true;
                }
            }
        }
        return false;
    }
    search(query) {
        if (!query || query.trim().length === 0) return [];

        const normalizedQuery = this.normalize(query);
        const tokens = normalizedQuery.split(/\s+/).filter(t => t.length > 0);
        if (tokens.length === 0) return [];

        const results = [];

        for (const item of this.index) {
            let score = 0;
            let matchesAll = true;
            let matchedReasons = [];

            for (const token of tokens) {
                let tokenMatched = false;
                if (item.name.includes(token)) {
                    score += 15;
                    tokenMatched = true;
                } else if (!tokenMatched) {
                    for (const [intent, keywords] of Object.entries(SEARCH_INTENTS)) {
                        if (keywords.includes(token) && item.tags.includes(intent)) {
                            score += 12;
                            tokenMatched = true;
                            matchedReasons.push(`Solves intent for "${intent.replace(/_/g, ' ')}"`);
                            break;
                        }
                    }
                }
                if (!tokenMatched && item.tags.some(t => t.includes(token) || this.isFuzzyMatch(token, t))) {
                    score += 10;
                    tokenMatched = true;
                    matchedReasons.push(`Matches deep semantic tags related to "${token}"`);
                } else if (!tokenMatched && this.isFuzzyMatch(token, item.name)) {
                    score += 8;
                    tokenMatched = true;
                } else if (!tokenMatched && item.category.includes(token)) {
                    score += 5;
                    tokenMatched = true;
                    matchedReasons.push(`Category match`);
                } else if (!tokenMatched && item.scrapedText && (item.scrapedText.includes(token) || this.isFuzzyMatch(token, item.scrapedText))) {
                    score += 3;
                    tokenMatched = true;
                    matchedReasons.push(`Content explicitly found inside product details`);
                } else if (!tokenMatched && this.isFuzzyMatch(token, item.description)) {
                    score += 2;
                    tokenMatched = true;
                }

                if (!tokenMatched) {
                    matchesAll = false;
                    break;
                }
            }

            if (matchesAll && score > 0) {
                results.push({ id: item.id, score: score, matchedReasons: matchedReasons });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }
}

const engine = new DODCHSearchEngine();
engine.init(defaultProductCatalog);
console.log("SEARCH RESULTS FOR 'shampoo':");
console.log(engine.search("shampoo"));
console.log("\nSEARCH RESULTS FOR 'serum':");
console.log(engine.search("serum"));
