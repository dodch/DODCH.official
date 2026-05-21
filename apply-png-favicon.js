const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !f.startsWith('.'));

let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Replace the old webp favicon
    const regex1 = /<link rel="icon" href="favicon-black-on-white\.webp\?v=5" type="image\/webp">/g;
    const regex2 = /<link rel="icon" href="IMG_3352\.webp\?v=4" type="image\/webp">/g;
    
    const newFavicon = `<link rel="icon" href="favicon-solid-white.png?v=6" type="image/png">`;

    let changed = false;
    if (regex1.test(content)) {
        content = content.replace(regex1, newFavicon);
        changed = true;
    }
    if (regex2.test(content)) {
        content = content.replace(regex2, newFavicon);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        updatedCount++;
    }
}

console.log(`✅ Updated ${updatedCount} HTML files to use the new PNG favicon.`);
