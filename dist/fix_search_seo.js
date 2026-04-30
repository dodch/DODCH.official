const e=require("fs");let s=e.readFileSync("seo.js","utf8");s=s.replace(/\"target\": \"https:\/\/dodch\.com\/shop\?q=\{search_term_string\}\"/g,'"target": "https://dodch.com/index.html?search={search_term_string}"'),e.writeFileSync("seo.js",s),console.log("seo.js search target fixed.");let t=e.readFileSync("script.js","utf8");const i=`
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
`;t.includes("DEEP LINK SEARCH INTEGRATION")||(t=t.replace(/}, 1500\); \/\/ Wait for potential firebase load/g,`}, 1500); // Wait for potential firebase load
${i}`),e.writeFileSync("script.js",t),console.log("script.js search integration added."));
