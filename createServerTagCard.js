const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * @param {GuildMember} member - The discord.js GuildMember
 * @param {string} [mockName] - Optional text to replace the tag name
 */
async function createServerTagCard(member, mockName = null) {
    // 1. Setup Data
    const user = await member.user.fetch(true);
    const guildInfo = user.primaryGuild;

    // We need at least a guild info (for the badge) OR a mock name to draw anything.
    // If the user has no tag AND provided no mock name, return null.
    if ((!guildInfo || !guildInfo.tag) && !mockName) {
        return null;
    }

    // --- LOGIC CHANGE: DETERMINE TEXT ---
    // Use mockName if provided, otherwise use real tag
    const tagText = mockName || guildInfo.tag; 

    // 2. Configuration & Dimensions
    const fontSize = 200; 
    const paddingX = 80;
    const paddingY = 60;
    const badgeSize = 200; 
    const contentGap = 40; 
    const cornerRadius = 60;
    const margin = 50; 

    const fontStack = `"Prima Sans Regular", "Geeza Bold", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;

    // 3. Pre-Load Badge (Only if user actually has a guild/badge)
    let badgeURL = null;
    let badgeImage = null;

    if (guildInfo) {
        if (typeof user.guildTagBadgeURL === 'function') {
            badgeURL = user.guildTagBadgeURL({ extension: 'png', size: 256 });
        } else if (guildInfo.badge && guildInfo.identityGuildId) {
            badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=256`;
        }

        if (badgeURL) {
            badgeImage = await loadImage(badgeURL).catch(() => null);
        }
    }

    // 4. Measure Text (Using the new tagText variable)
    const tempCanvas = createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `bold ${fontSize}px "Prima Sans Regular", ${fontStack}`;
    
    const textMetrics = tempCtx.measureText(tagText);
    const textWidth = textMetrics.width;
    
    let boxWidth = (paddingX * 2) + textWidth;
    if (badgeImage) {
        boxWidth += badgeSize + contentGap;
    }
    
    const boxHeight = fontSize + (paddingY * 2);
    const canvasWidth = boxWidth + (margin * 2);
    const canvasHeight = boxHeight + (margin * 2);

    // 5. Initialize Real Canvas
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 6. Draw
    const startX = margin;
    const startY = margin;

    // Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    
    // Background
    ctx.fillStyle = '#404249'; 
    ctx.beginPath();
    ctx.roundRect(startX, startY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();
    ctx.restore();

    // Content
    let currentContentX = startX + paddingX;
    const centerY = startY + (boxHeight / 2);

    if (badgeImage) {
        const badgeY = centerY - (badgeSize / 2);
        ctx.drawImage(badgeImage, currentContentX, badgeY, badgeSize, badgeSize);
        currentContentX += badgeSize + contentGap;
    }

    // Draw Text (Using tagText)
    ctx.font = `bold ${fontSize}px "Prima Sans Regular", ${fontStack}`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle'; 
    ctx.fillText(tagText, currentContentX, centerY - 5);

    return canvas.toBuffer('image/png');
}

module.exports = { createServerTagCard };
