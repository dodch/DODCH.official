const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !f.startsWith('.'));

let updatedCount = 0;

for (const file of files) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');

    // Regex to match the block of favicons
    const faviconRegex = /<link rel="icon" href="[^"]+" type="image\/webp" media="\(prefers-color-scheme: light\)">(?:\s*<link rel="icon" href="[^"]+" type="image\/webp" media="\(prefers-color-scheme: dark\)">)?(?:\s*<link rel="apple-touch-icon" href="[^"]+">)?/g;
    
    // An alternative broader regex if they are formatted differently
    const genericRegex = /<link rel="icon"[^>]*>[\s\n]*<link rel="icon"[^>]*>[\s\n]*<link rel="apple-touch-icon"[^>]*>/gi;

    const newFaviconBlock = `<link rel="icon" href="IMG_3352.webp?v=4" type="image/webp">\n    <link rel="apple-touch-icon" href="IMG_3355.webp?v=4">`;

    let changed = false;

    if (faviconRegex.test(content)) {
        content = content.replace(faviconRegex, newFaviconBlock);
        changed = true;
    } else if (genericRegex.test(content)) {
        content = content.replace(genericRegex, newFaviconBlock);
        changed = true;
    } else {
        // Fallback: replace line by line
        let lines = content.split('\n');
        let newLines = [];
        let replaced = false;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('rel="icon"') || lines[i].includes('rel="apple-touch-icon"')) {
                if (!replaced) {
                    newLines.push(`    ${newFaviconBlock}`);
                    replaced = true;
                    changed = true;
                }
            } else {
                newLines.push(lines[i]);
            }
        }
        if (changed) content = newLines.join('\n');
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        updatedCount++;
    }
}

console.log(`✅ Successfully updated favicons in ${updatedCount} HTML files.`);
