const fs = require('fs');
const path = require('path');
const https = require('https');
const { GlobalFonts } = require('@napi-rs/canvas');

const FONT_URL = "https://github.com/samuelngs/apple-emoji-linux/releases/download/v17.4/AppleColorEmoji.ttf";
const FONT_DIR = path.join(__dirname, 'fontss'); 
const FONT_PATH = path.join(FONT_DIR, 'AppleColorEmoji.ttf');

async function loadFonts() {
    if (!fs.existsSync(FONT_DIR)) fs.mkdirSync(FONT_DIR);

    if (!fs.existsSync(FONT_PATH)) {
        console.log('🍎 iOS Emoji font missing. Downloading...');
        try { await downloadFile(FONT_URL, FONT_PATH); } 
        catch (err) { console.error('❌ Failed download:', err); }
    }

    // --- REGISTER FONTS ---

    // 1. Noto Sans (Server Name)
    const notoSansPath = path.join(FONT_DIR, 'NotoSans-Bold.ttf');
    if (fs.existsSync(notoSansPath)) GlobalFonts.registerFromPath(notoSansPath, 'Noto Sans');

    // 2. SF Pro (Main Display Name - Bold)
    const gsBoldPath = path.join(FONT_DIR, 'gg sans Bold.ttf');
    if (fs.existsSync(gsBoldPath)) GlobalFonts.registerFromPath(gsBoldPath, 'gg sans Bold');
    
    // 3. SF Pro SemiBold (Username) << NEW
    const sfProSemiPath = path.join(FONT_DIR, 'SF Pro - Semibold.otf');
    if (fs.existsSync(sfProSemiPath)) {
        GlobalFonts.registerFromPath(sfProSemiPath, 'SF Pro Semi');
        }


    const ReemBoldPath = path.join(FONT_DIR, 'ReemKufi-Bold.ttf');
    if (fs.existsSync(ReemBoldPath)) {
        GlobalFonts.registerFromPath(ReemBoldPath, 'ReemKufi Bold');
        }


     const GeezaBoldPath = path.join(FONT_DIR, 'Geeza Pro Bold.ttf');
    if (fs.existsSync(GeezaBoldPath)) {
        GlobalFonts.registerFromPath(GeezaBoldPath, 'Geeza Bold');
        }


    // 4. Arabic (Scheherazade New)
    const arabicPath = path.join(FONT_DIR, 'SFArabic.ttf');
    if (fs.existsSync(arabicPath))  GlobalFonts.registerFromPath(arabicPath, 'SFArabic');


    // 5. Thai (Thonburi)
    const thaiPath = path.join(FONT_DIR, 'Thonburi-Bold.ttf');
    if (fs.existsSync(thaiPath)) GlobalFonts.registerFromPath(thaiPath, 'Thonburi');


     const koreanPath = path.join(FONT_DIR, 'apple-sd-gothic-neo-bold.ttf');
    if (fs.existsSync(koreanPath)) GlobalFonts.registerFromPath(koreanPath, 'Apple Gothic');


    const japanesePath = path.join(FONT_DIR, 'hiragino-sans-gb.otf');
    if (fs.existsSync(japanesePath)) GlobalFonts.registerFromPath(japanesePath, 'Hiragino Sans');


   const chinesePath = path.join(FONT_DIR, 'pingfang-sc-bold.ttf');
    if (fs.existsSync(chinesePath)) GlobalFonts.registerFromPath(chinesePath, 'Pingfang');

    const symbolPath = path.join(FONT_DIR, 'Symbol.ttf');
    if (fs.existsSync(symbolPath)) GlobalFonts.registerFromPath(symbolPath, 'Symbol');


   const applesymbolPath = path.join(FONT_DIR, 'Apple Symbols.ttf');
    if (fs.existsSync(applesymbolPath)) GlobalFonts.registerFromPath(applesymbolPath, 'Apple Symbols');

  
   const symbol1Path = path.join(FONT_DIR, 'NotoSansSymbols-Bold.ttf');
    if (fs.existsSync(symbol1Path)) GlobalFonts.registerFromPath(symbol1Path, 'Noto Symbol');


   const symbol2Path = path.join(FONT_DIR, 'NotoSansSymbols2-Regular.ttf');
    if (fs.existsSync(symbol2Path)) GlobalFonts.registerFromPath(symbol2Path, 'Noto Symbol 2');


  const mathPath = path.join(FONT_DIR, 'NotoSansMath-Regular.ttf');
    if (fs.existsSync(mathPath)) GlobalFonts.registerFromPath(mathPath, 'Noto Math');
  
  
  const hieroglyphsPath = path.join(FONT_DIR, 'NotoSansEgyptianHieroglyphs-Regular.ttf');
    if (fs.existsSync(hieroglyphsPath)) GlobalFonts.registerFromPath(hieroglyphsPath, 'Noto Hieroglyphs');


   const musicPath = path.join(FONT_DIR, 'NotoMusic-Regular.ttf');
    if (fs.existsSync(musicPath)) GlobalFonts.registerFromPath(musicPath, 'Noto Music');
     

    // 6. Emoji
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
