const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * Creates a high-res card containing ONLY the Server Tag.
 * @param {GuildMember} member - The discord.js GuildMember
 */
async function createServerTagCard(member) {
    // 1. Setup Data
    const user = await member.user.fetch(true);
    
    // Check if user has the custom property 'primaryGuild' (based on your previous code)
    const guildInfo = user.primaryGuild;
    
    // Guard clause: If no tag exists, return null
    if (!guildInfo || !guildInfo.tag) {
        return null;
    }

    // 2. Configuration & Dimensions (High Res)
    const fontSize = 200; // Large size for download quality
    const paddingX = 80;  // Padding inside the box
    const paddingY = 60;
    const badgeSize = 200; // Badge same height as text
    const contentGap = 40; // Space between badge and text
    const cornerRadius = 60;
    
    // Canvas padding (outer margin) to prevent shadow clipping
    const margin = 50; 

    // Font Stack
    const fontStack = `"gg sans Bold", "SFArabic", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;

    // 3. Pre-Load Badge (if exists)
    let badgeURL = null;
    let badgeImage = null;

    if (typeof user.guildTagBadgeURL === 'function') {
        badgeURL = user.guildTagBadgeURL({ extension: 'png', size: 256 });
    } else if (guildInfo.badge && guildInfo.identityGuildId) {
        badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=256`;
    }

    if (badgeURL) {
        badgeImage = await loadImage(badgeURL).catch(() => null);
    }

    // 4. Measure Text to Determine Canvas Size
    // Create a temporary canvas just to measure
    const tempCanvas = createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `bold ${fontSize}px "Prima Sans Regular", ${fontStack}`;
    
    const textMetrics = tempCtx.measureText(guildInfo.tag);
    const textWidth = textMetrics.width;
    
    // Calculate Box Dimensions
    let boxWidth = (paddingX * 2) + textWidth;
    if (badgeImage) {
        boxWidth += badgeSize + contentGap;
    }
    
    // Height is roughly font size + vertical padding
    // We add a bit extra for descenders (g, j, y, etc)
    const boxHeight = fontSize + (paddingY * 2);

    // Calculate Final Canvas Dimensions (Box + Margins for shadow)
    const canvasWidth = boxWidth + (margin * 2);
    const canvasHeight = boxHeight + (margin * 2);

    // 5. Initialize Real Canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 6. Draw the Tag Card
    const startX = margin;
    const startY = margin;

    // A. Draw Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    
    // B. Draw Background Rounded Rect
    ctx.fillStyle = '#404249'; // The dark grey discord tag background
    ctx.beginPath();
    ctx.roundRect(startX, startY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();
    ctx.restore();

    // C. Draw Content
    let currentContentX = startX + paddingX;
    const centerY = startY + (boxHeight / 2);

    // Draw Badge
    if (badgeImage) {
        const badgeY = centerY - (badgeSize / 2);
        ctx.drawImage(badgeImage, currentContentX, badgeY, badgeSize, badgeSize);
        currentContentX += badgeSize + contentGap;
    }

    // Draw Text
    ctx.font = `bold ${fontSize}px "Prima Sans Regular", ${fontStack}`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle'; 
    // Offset slightly for visual centering due to font baselines
    ctx.fillText(guildInfo.tag, currentContentX, centerY - 5);

    return canvas.toBuffer('image/png');
}

module.exports = { createServerTagCard };
