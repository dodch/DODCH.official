const sharp = require('sharp');
const path = require('path');

async function createFavicons() {
    try {
        // 1. Create Black Logo on White Background
        await sharp('IMG_3352.webp')
            .flatten({ background: '#ffffff' }) // Add solid white background
            .webp()
            .toFile('favicon-black-on-white.webp');
        
        console.log('✅ Created favicon-black-on-white.webp (Solid White Background)');
        
    } catch (error) {
        console.error('Error generating favicon:', error);
    }
}

createFavicons();
