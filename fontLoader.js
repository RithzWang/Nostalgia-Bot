const fs = require('fs');
const path = require('path');
const https = require('https');
const { GlobalFonts } = require('@napi-rs/canvas');

// Direct link to the Apple Emoji file
const FONT_URL = "https://github.com/samuelngs/apple-emoji-linux/releases/download/v17.4/AppleColorEmoji.ttf";

// Points to your 'fontss' folder
const FONT_DIR = path.join(__dirname, 'fontss'); 
const FONT_PATH = path.join(FONT_DIR, 'AppleColorEmoji.ttf');

async function loadFonts() {
    // 1. Create 'fontss' folder if it doesn't exist
    if (!fs.existsSync(FONT_DIR)) {
        fs.mkdirSync(FONT_DIR);
    }

    // 2. Check if we have the Apple Emoji font, if not, download it
    if (!fs.existsSync(FONT_PATH)) {
        console.log('🍎 iOS Emoji font missing. Downloading now... (This takes a moment)');
        try {
            await downloadFile(FONT_URL, FONT_PATH);
            console.log('✅ Download complete!');
        } catch (err) {
            console.error('❌ Failed to download emoji font:', err);
        }
    }

    // --- REGISTER FONTS ---

    // 1. English (SF Pro)
    // Checks for both Bold and Regular just in case
    const sfProPath = path.join(FONT_DIR, 'SF-Pro-Display-Bold.otf');
    if (fs.existsSync(sfProPath)) GlobalFonts.registerFromPath(sfProPath, 'SF Pro');

    const sfProReg = path.join(FONT_DIR, 'SF-Pro-Display-Regular.otf');
    if (fs.existsSync(sfProReg)) GlobalFonts.registerFromPath(sfProReg, 'SF Pro');

    // 2. Arabic (Scheherazade New)
    const arabicPath = path.join(FONT_DIR, 'ScheherazadeNew-Bold.ttf');
    if (fs.existsSync(arabicPath)) {
        // We register it as "Scheherazade" to make typing easier
        GlobalFonts.registerFromPath(arabicPath, 'Scheherazade');
        console.log('✅ Arabic font loaded (Scheherazade)');
    } else {
        console.log('⚠️ Arabic font not found. Check filename in fontss/');
    }

    // 3. Thai (Thonburi)
    const thaiPath = path.join(FONT_DIR, 'Thonburi-Bold.ttf');
    if (fs.existsSync(thaiPath)) {
        GlobalFonts.registerFromPath(thaiPath, 'Thonburi');
        console.log('✅ Thai font loaded (Thonburi)');
    } else {
        console.log('⚠️ Thai font not found. Check filename in fontss/');
    }

    // 4. Emoji (Apple Color Emoji)
    if (fs.existsSync(FONT_PATH)) {
        GlobalFonts.registerFromPath(FONT_PATH, 'Apple Color Emoji');
    }

    console.log('✅ All fonts registration complete.');
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
