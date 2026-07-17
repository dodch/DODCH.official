const fs = require('fs');
const path = require('path');

const loaderStyleScript = `
    <!-- Page load overlay: covers broken paint, fades out once DOM ready -->
    <style>
        #page-loader {
            position: fixed; inset: 0; background: #fff;
            z-index: 99999; pointer-events: none;
            display: flex; align-items: center; justify-content: center;
            transition: opacity 0.6s ease 0.2s;
        }
        #page-loader .loader-logo {
            font-family: var(--font-serif, 'Playfair Display', serif);
            font-size: clamp(2.5rem, 6vw, 4rem);
            color: #111; letter-spacing: 0.1em;
            opacity: 1; transition: opacity 0.4s ease, transform 0.6s ease;
        }
        #page-loader.fade-out { opacity: 0; }
        #page-loader.fade-out .loader-logo { opacity: 0; transform: scale(0.95); }
    </style>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const loader = document.getElementById('page-loader');
            if (loader) requestAnimationFrame(() => loader.classList.add('fade-out'));
        });
    </script>
`;

const loaderDiv = `    <div id="page-loader"><span class="loader-logo">DODCH</span></div>`;

const targetDir = 'c:/Users/DELL/Desktop/DODCH.official';

function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it already has the loader style/script
    if (content.includes('id="page-loader"') || content.includes('#page-loader')) {
        console.log(`Skipping or updating: ${path.basename(filePath)}`);
        // Remove existing page loader to avoid duplicates if any
        content = content.replace(/<!-- Page load overlay:[\s\S]*?<\/script>/g, '');
        content = content.replace(/<div id="page-loader">[\s\S]*?<\/div>/g, '');
    }

    // Inject into <head> before </head>
    if (content.includes('</head>')) {
        content = content.replace('</head>', `${loaderStyleScript}\n</head>`);
    } else {
        console.warn(`No </head> tag found in ${filePath}`);
        return;
    }

    // Inject immediately after <body...> tag
    const bodyRegex = /(<body[^>]*>)/i;
    if (bodyRegex.test(content)) {
        content = content.replace(bodyRegex, `$1\n${loaderDiv}`);
    } else {
        console.warn(`No <body> tag found in ${filePath}`);
        return;
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully injected loader into ${path.basename(filePath)}`);
}

// Read directory
const files = fs.readdirSync(targetDir);
files.forEach(file => {
    if (file.endsWith('.html') && file !== 'checkout_recaptcha.html') {
        const filePath = path.join(targetDir, file);
        processHtmlFile(filePath);
    }
});
