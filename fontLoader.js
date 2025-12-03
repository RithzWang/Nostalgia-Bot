const fs = require('fs');
const path = require('path');
const https = require('https');
const { GlobalFonts } = require('@napi-rs/canvas');

const FONT_URL = "https://github.com/samuelngs/apple-emoji-linux/releases/download/v17.4/AppleColorEmoji.ttf";
const FONT_DIR = path.join(__dirname, 'fontss'); 
const FONT_PATH = path.join(FONT_DIR, 'AppleColorEmoji.ttf');

async function loadFonts() {
    if (!fs.existsSync(FONT_DIR)) fs.mkdirSync(FONT_DIR);

    // Download Emoji if missing
    if (!fs.existsSync(FONT_PATH)) {
        console.log('🍎 iOS Emoji font missing. Downloading...');
        try { await downloadFile(FONT_URL, FONT_PATH); } 
        catch (err) { console.error('❌ Failed download:', err); }
    }

    // --- REGISTER FONTS ---

    // 1. Noto Sans (Strictly for Server Name)
    const notoSansPath = path.join(FONT_DIR, 'NotoSans-Bold.ttf');
    if (fs.existsSync(notoSansPath)) {
        GlobalFonts.registerFromPath(notoSansPath, 'Noto Sans');
        console.log('✅ Noto Sans loaded');
    }

    // 2. English (SF Pro)
    const sfProPath = path.join(FONT_DIR, 'SF-Pro-Display-Bold.otf');
    if (fs.existsSync(sfProPath)) GlobalFonts.registerFromPath(sfProPath, 'SF Pro');

    const sfProReg = path.join(FONT_DIR, 'SF-Pro-Display-Regular.otf');
    if (fs.existsSync(sfProReg)) GlobalFonts.registerFromPath(sfProReg, 'SF Pro');

    const sfPro3Path = path.join(FONT_DIR, 'SF Pro SemiBold.otf');
    if (fs.existsSync(sfProPath)) GlobalFonts.registerFromPath(sfProPath, 'SF Pro3');

    // 3. Arabic (Scheherazade New)
    const arabicPath = path.join(FONT_DIR, 'ScheherazadeNew-Bold.ttf');
    if (fs.existsSync(arabicPath)) GlobalFonts.registerFromPath(arabicPath, 'Scheherazade');

    // 4. Thai (Thonburi)
    const thaiPath = path.join(FONT_DIR, 'Thonburi-Bold.ttf');
    if (fs.existsSync(thaiPath)) GlobalFonts.registerFromPath(thaiPath, 'Thonburi');

    // 5. Emoji
    if (fs.existsSync(FONT_PATH)) GlobalFonts.registerFromPath(FONT_PATH, 'Apple Color Emoji');

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
            file.on('finish', () => { file.close(resolve); });
        }).on('error', (err) => { fs.unlink(dest, () => reject(err)); });
    });
}

module.exports = { loadFonts };
