const fs = require('fs');

// 1. Fix seo.js search target
let seoJs = fs.readFileSync('seo.js', 'utf8');
seoJs = seoJs.replace(/\"target\": \"https:\/\/dodch\.com\/shop\?q=\{search_term_string\}\"/g, '"target": "https://dodch.com/index.html?search={search_term_string}"');
fs.writeFileSync('seo.js', seoJs);
console.log('seo.js search target fixed.');

// 2. Fix script.js to handle ?search= in URL
let scriptJs = fs.readFileSync('script.js', 'utf8');
const searchInjection = `
    // --- DEEP LINK SEARCH INTEGRATION ---
    const urlParams = new URLSearchParams(window.location.search);
    const initialSearch = urlParams.get('search');
    if (initialSearch) {
        setTimeout(() => {
            const inp = document.getElementById('navbar-search-input');
            const toggle = document.getElementById('search-toggle-btn');
            if (inp && toggle) {
                if (!document.querySelector('.search-container').classList.contains('active')) {
                    toggle.click();
                }
                inp.value = initialSearch;
                inp.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, 2000);
    }
`;

if (!scriptJs.includes('DEEP LINK SEARCH INTEGRATION')) {
    scriptJs = scriptJs.replace(/}, 1500\); \/\/ Wait for potential firebase load/g, `}, 1500); // Wait for potential firebase load\n${searchInjection}`);
    fs.writeFileSync('script.js', scriptJs);
    console.log('script.js search integration added.');
}
