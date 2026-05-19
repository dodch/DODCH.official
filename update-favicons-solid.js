const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !f.startsWith('.'));

let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to match the previously set favicon
    const oldFavicon = /<link rel="icon" href="IMG_3352\.webp\?v=4" type="image\/webp">/g;
    const newFavicon = `<link rel="icon" href="favicon-black-on-white.webp?v=5" type="image/webp">`;

    if (oldFavicon.test(content)) {
        content = content.replace(oldFavicon, newFavicon);
        fs.writeFileSync(filePath, content, 'utf8');
        updatedCount++;
    }
}

console.log(`✅ Successfully injected solid-background favicons into ${updatedCount} HTML files.`);
