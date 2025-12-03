const fs = require('fs');
const path = require('path');
const https = require('https');
const { GlobalFonts } = require('@napi-rs/canvas');

// Direct link to the Apple Emoji file
const FONT_URL = "https://github.com/samuelngs/apple-emoji-linux/releases/download/v17.4/AppleColorEmoji.ttf";

// !!! UPDATED: Points to your 'fontss' folder
const FONT_DIR = path.join(__dirname, 'fontss'); 
const FONT_PATH = path.join(FONT_DIR, 'AppleColorEmoji.ttf');

async function loadFonts() {
    // 1. Create 'fontss' folder if it doesn't exist
    if (!fs.existsSync(FONT_DIR)) {
        fs.mkdirSync(FONT_DIR);
    }

    // 2. Check if we have the Apple Emoji font, if not, download it
    if (!fs.existsSync(FONT_PATH)) {
        console.log('🍎 iOS Emoji font missing. Downloading now into /fontss... (This takes a moment)');
        try {
            await downloadFile(FONT_URL, FONT_PATH);
            console.log('✅ Download complete!');
        } catch (err) {
            console.error('❌ Failed to download emoji font:', err);
        }
    }

    // 3. Register your existing SF Pro fonts from 'fontss'
    // I am registering them all under the family name "SF Pro" so they work together
    
    const boldPath = path.join(FONT_DIR, 'SF-Pro-Display-Bold.otf');
    if (fs.existsSync(boldPath)) {
        GlobalFonts.registerFromPath(boldPath, 'SF Pro');
    }

    const regularPath = path.join(FONT_DIR, 'SF-Pro-Display-Regular.otf');
    if (fs.existsSync(regularPath)) {
        GlobalFonts.registerFromPath(regularPath, 'SF Pro');
    }

    // 4. Register the downloaded Apple Emoji
    if (fs.existsSync(FONT_PATH)) {
        GlobalFonts.registerFromPath(FONT_PATH, 'Apple Color Emoji');
    }

    console.log('✅ All fonts in /fontss registered.');
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
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
