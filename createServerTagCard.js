const { createCanvas, loadImage } = require('@napi-rs/canvas');

/**
 * @param {GuildMember} member - The discord.js GuildMember
 * @param {string} [mockName] - Optional text to replace the tag name
 */
async function createServerTagCard(member, mockName = null) {
    // 1. Setup Data
    const user = await member.user.fetch(true);
    const guildInfo = user.primaryGuild;

    // Guard Clause: No guild tag AND no custom text = nothing to draw
    if ((!guildInfo || !guildInfo.tag) && !mockName) {
        return null;
    }

    // Determine Text to Display
    const tagText = mockName || guildInfo.tag; 

    // 2. Configuration (Stable Sizes)
    const fontSize = 190; 
    const badgeSize = 200; // Fixed size for the icon
    const paddingX = 80;   // Left/Right padding inside the box
    const paddingY = 60;   // Top/Bottom padding
    const contentGap = 40; // Space between Icon and Text
    const cornerRadius = 60;
    const margin = 50;     // Outer margin for shadow

    // --- STABILITY CONFIG ---
    // Minimum width of the content box (excluding margins). 
    // This ensures cards for "ABC" and "TEST" are the same width.
    const minBoxWidth = 750; 

    const fontStack = `"Prima Sans Regular", "SFArabic", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;

    // 3. Pre-Load Badge
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

    // 4. Measure Text & Calculate Dimensions
    const tempCanvas = createCanvas(1, 1);
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.font = `bold ${fontSize}px "Prima Sans Regular", ${fontStack}`;
    
    const textMetrics = tempCtx.measureText(tagText);
    const textWidth = textMetrics.width;
    
    // Calculate the "Natural" width needed
    let naturalContentWidth = (paddingX * 2) + textWidth;
    if (badgeImage) {
        naturalContentWidth += badgeSize + contentGap;
    }

    // Apply Minimum Width for Stability
    // If text is short, use minBoxWidth. If text is long, expand.
    const boxWidth = Math.max(minBoxWidth, naturalContentWidth);
    
    // Fixed Height based on font size (Stable vertical size)
    const boxHeight = fontSize + (paddingY * 2);

    // Final Canvas Dimensions
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
    const centerY = startY + (boxHeight / 2);

    // A. Drop Shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    
    // B. Background Box
    ctx.fillStyle = '#404249'; 
    ctx.beginPath();
    ctx.roundRect(startX, startY, boxWidth, boxHeight, cornerRadius);
    ctx.fill();
    ctx.restore();

    // C. Draw Content (Left Aligned for Stability)
    // We start drawing from the left padding.
    let currentContentX = startX + paddingX;

    // Draw Icon (if exists)
    if (badgeImage) {
        const badgeY = centerY - (badgeSize / 2);
        ctx.drawImage(badgeImage, currentContentX, badgeY, badgeSize, badgeSize);
        // Move X cursor to the right of the badge
        currentContentX += badgeSize + contentGap;
    }

    // Draw Text
    ctx.font = `bold ${fontSize}px "Prima Sans Regular", ${fontStack}`;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle'; 
    
    // Vertical correction: '- 5' moves text up slightly to center it visually against the icon
    ctx.fillText(tagText, currentContentX, centerY - 5);

    return canvas.toBuffer('image/png');
}

module.exports = { createServerTagCard };
