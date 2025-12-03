const fs = require('fs');
const path = require('path');
const https = require('https');
const { GlobalFonts } = require('@napi-rs/canvas');

// Direct link to a Linux-compatible Apple Emoji file (Source: samuelngs/apple-emoji-linux)
const FONT_URL = "https://github.com/samuelngs/apple-emoji-linux/releases/download/v17.4/AppleColorEmoji.ttf";
const FONT_DIR = path.join(__dirname, 'fonts');
const FONT_PATH = path.join(FONT_DIR, 'AppleColorEmoji.ttf');

async function loadFonts() {
    // 1. Create fonts folder if it doesn't exist
    if (!fs.existsSync(FONT_DIR)) {
        fs.mkdirSync(FONT_DIR);
    }

    // 2. Check if we already have the emoji font
    if (!fs.existsSync(FONT_PATH)) {
        console.log('🍎 iOS Emoji font missing. Downloading now... (This takes a moment)');
        await downloadFile(FONT_URL, FONT_PATH);
        console.log('✅ Download complete!');
    }

    // 3. Register the fonts
    // Register SF Pro (You should still upload this one to GitHub as it is small)
    const sfProPath = path.join(FONT_DIR, 'SF-Pro-Display-Bold.otf');
    if (fs.existsSync(sfProPath)) {
        GlobalFonts.registerFromPath(sfProPath, 'SF Pro');
    }

    // Register Apple Emoji
    GlobalFonts.registerFromPath(FONT_PATH, 'Apple Color Emoji');
    console.log('🎨 Fonts registered successfully.');
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            // Handle redirects (GitHub Releases often redirect)
            if (response.statusCode === 302 || response.statusCode === 301) {
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

module.exports = { loadFonts };
