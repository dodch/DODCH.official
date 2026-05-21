const sharp = require('sharp');

async function createFavicon() {
    try {
        // Create a 512x512 white canvas, composite the logo over it
        await sharp({
            create: {
                width: 512,
                height: 512,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            }
        })
        .composite([
            {
                input: 'IMG_3352.webp',
                blend: 'over'
            }
        ])
        .png() // Save as PNG which is universally supported for favicons
        .toFile('favicon-solid-white.png');
        
        console.log('✅ Created favicon-solid-white.png with a guaranteed solid white background.');
    } catch (err) {
        console.error('Error:', err);
    }
}

createFavicon();
