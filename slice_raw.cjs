const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImagePath = 'C:\\Users\\shlok\\.gemini\\antigravity\\brain\\992113ea-aa65-4239-bac2-7af8899cb165\\media__1776966755878.jpg';
const outDir = path.join(__dirname, 'instagram_ready_slides_original');

if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
}

// Create a custom SVG buffer for the logo: just the text, no blue background.
// The original logo has fill="#7C3AED" (purple), and font-weight="700".
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="30" viewBox="0 0 100 30">
  <text x="0" y="20" fill="#fff" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="bold">Repdox</text>
</svg>
`;
const logoBuffer = Buffer.from(logoSvg);

async function processImages() {
    const originalImage = sharp(inputImagePath);
    const metadata = await originalImage.metadata();
    
    // 1024 / 3 = 341.33
    const cellWidth = Math.floor(metadata.width / 3);
    const cellHeight = Math.floor(metadata.height / 3);
    
    let slideIndex = 1;
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const left = col * cellWidth;
            const top = row * cellHeight;
            
            const w = Math.min(cellWidth, metadata.width - left);
            const h = Math.min(cellHeight, metadata.height - top);
            
            const cellBuffer = await sharp(inputImagePath)
                .extract({ left, top, width: w, height: h })
                .toBuffer();
                
            // We draw a small black/dark box to cover the old text, then our new white logo.
            const coverBox = await sharp({
                create: {
                    width: 90,
                    height: 25,
                    channels: 4,
                    background: { r: 5, g: 5, b: 5, alpha: 1 }
                }
            }).png().toBuffer();

            // The old text is near the top-left, maybe x:10, y:10 in the 341x341 cell.
            await sharp(cellBuffer)
                .composite([
                    { input: coverBox, top: 10, left: 10 },
                    { input: logoBuffer, top: 12, left: 12 }
                ])
                .toFile(path.join(outDir, `slide_${slideIndex}.png`));
                
            slideIndex++;
        }
    }
    console.log("Done slicing original pixels without blur!");
}

processImages().catch(console.error);
