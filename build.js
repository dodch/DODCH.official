/**
 * DODCH Build Script
 * Minifies JS and CSS from Root → dist/ for deployment.
 * Run: node build.js
 */
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const SRC = '.';
const OUT = './dist';

// Files/folders to ignore during asset copy and minification
const IGNORE_LIST = [
    'node_modules',
    '.git',
    '.github',
    '.firebase',
    '.next',
    'dist',
    'app',
    'functions',
    'public', // Just in case it's recreated
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'next.config.mjs',
    'firebase.json',
    'firestore.rules',
    'firestore.indexes.json',
    'build.js',
    'postcss.config.js',
    'tailwind.config.ts',
    'next-env.d.ts',
    'llms.txt',
    'llms-full.txt',
    'DODCH.official.code-workspace',
    'scratch',
    'prices.json',
    'generate-feed.js',
    'sync-db.js',
    'generate-favicon.js',
    'generate-solid-png-favicon.js',
    'update-favicons.js',
    'update-favicons-solid.js',
    'apply-png-favicon.js'
];

// ─── 0. Generate Google Merchant Feed ───────────────────────────────────────
console.log('📦 Generating Google Merchant feed...');
require('child_process').execSync('node generate-feed.js', { stdio: 'inherit' });

// ─── 1. Clean + recreate dist/ ─────────────────────────────────────────────
if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

// ─── 2. Copy all non-JS/CSS assets (HTML, images, video, json, etc.) ───────
function copyAssets(srcDir, outDir) {
    for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
        if (IGNORE_LIST.includes(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;

        const srcPath = path.join(srcDir, entry.name);
        const outPath = path.join(outDir, entry.name);

        if (entry.isDirectory()) {
            fs.mkdirSync(outPath, { recursive: true });
            copyAssets(srcPath, outPath);
        } else {
            const ext = path.extname(entry.name).toLowerCase();
            // JS and CSS will be minified separately; skip them here
            if (ext !== '.js' && ext !== '.css') {
                fs.copyFileSync(srcPath, outPath);
            }
        }
    }
}

console.log('📁 Copying static assets...');
copyAssets(SRC, OUT);

// ─── 3. Minify all JS files ─────────────────────────────────────────────────
const jsFiles = fs.readdirSync(SRC)
    .filter(f => f.endsWith('.js') && !IGNORE_LIST.includes(f))
    .map(f => path.join(SRC, f));

console.log(`⚡ Minifying ${jsFiles.length} JS files...`);

(async () => {
    // Minify each JS file individually
    for (const file of jsFiles) {
        const outFile = path.join(OUT, path.basename(file));
        try {
            await esbuild.build({
                entryPoints: [file],
                outfile: outFile,
                minify: true,
                bundle: false,
                format: 'esm',
                target: ['es2020'],
                logLevel: 'warning',
            });
            const src = fs.statSync(file).size;
            const out = fs.statSync(outFile).size;
            const saved = src > 0 ? (((src - out) / src) * 100).toFixed(1) : 0;
            console.log(`  ✓ ${path.basename(file)}: ${(src/1024).toFixed(1)} KiB → ${(out/1024).toFixed(1)} KiB (−${saved}%)`);
        } catch (err) {
            console.warn(`  ⚠ ${path.basename(file)}: minification skipped (${err.message.split('\n')[0]})`);
            fs.copyFileSync(file, outFile);
        }
    }

    // ─── 4. Minify CSS ──────────────────────────────────────────────────────
    const cssFiles = fs.readdirSync(SRC)
        .filter(f => f.endsWith('.css') && !IGNORE_LIST.includes(f))
        .map(f => path.join(SRC, f));

    console.log(`🎨 Minifying ${cssFiles.length} CSS files...`);

    for (const file of cssFiles) {
        const outFile = path.join(OUT, path.basename(file));
        try {
            await esbuild.build({
                entryPoints: [file],
                outfile: outFile,
                minify: true,
                loader: { '.css': 'css' },
                logLevel: 'warning',
            });
            const src = fs.statSync(file).size;
            const out = fs.statSync(outFile).size;
            const saved = src > 0 ? (((src - out) / src) * 100).toFixed(1) : 0;
            console.log(`  ✓ ${path.basename(file)}: ${(src/1024).toFixed(1)} KiB → ${(out/1024).toFixed(1)} KiB (−${saved}%)`);
        } catch (err) {
            console.warn(`  ⚠ ${path.basename(file)}: minification skipped`);
            fs.copyFileSync(file, outFile);
        }
    }

    console.log('\n✅ Build complete! Output in dist/');
    console.log('🚀 Run: firebase deploy --only hosting');
})();
