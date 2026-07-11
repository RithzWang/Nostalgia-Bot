const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { fetchAdvancedProfile } = require('./utils/v9Scraper'); 

// ==========================================
// HELPERS
// ==========================================

// Helper: Safely load images with a strict timeout.
// Prevents the bot from freezing if Discord's CDN lags during a join raid.
async function safeLoadImage(url, timeoutMs = 2500) {
    if (!url) return null;
    return Promise.race([
        loadImage(url).catch(() => null),
        new Promise(resolve => setTimeout(() => resolve(null), timeoutMs))
    ]);
}

// Helper: Convert Integer or String Color to safe Hex format
function intToHex(color) {
    if (color === null || color === undefined) return null;
    if (typeof color === 'string') return color.startsWith('#') ? color : `#${color}`;
    return '#' + color.toString(16).padStart(6, '0');
}

// Helper: Darken/Lighten Hex Color
function shadeColor(color, percent) {
    var f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = f >> 8 & 0x00FF,
        B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

// Helper: Check if Color is Light or Dark
function isColorLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128;
}

// ==========================================
// MAIN FUNCTION
// ==========================================

/**
 * @param {GuildMember} member - The discord.js GuildMember
 * @param {Array<number|string>} [themeColors] - Optional: Array of [Primary, Accent] colors from profile API
 */
async function createWelcomeImage(member, themeColors = null) {
    // 1. Setup & Dimensions
    const user = await member.user.fetch(true);

    const dim = {
        height: 606,
        width: 1770,
        margin: 100
    };

    const topOffset = 45; 

    const canvas = createCanvas(dim.width, dim.height + topOffset);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ==========================================
    // LAYER 1: THE CARD BACKGROUND
    // ==========================================
    ctx.save(); 
    ctx.translate(0, topOffset);

    // Create Card Shape
    const cornerRadius = 80;
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip(); 

    // Fetch Images using the safeLoadImage helper
    const bannerURL = user.bannerURL({ extension: 'png', size: 2048 });
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 2048 });
    
    let backgroundBuf = null;
    if (bannerURL) {
        backgroundBuf = await safeLoadImage(bannerURL, 2000);
    }
    // Fallback to avatar for the background if banner fails
    if (!backgroundBuf && avatarURL) {
        backgroundBuf = await safeLoadImage(avatarURL, 2000);
    }

    // Draw Background
    if (backgroundBuf) {
        const canvasRatio = dim.width / dim.height;
        const sHeight = backgroundBuf.width / canvasRatio;

        if (backgroundBuf.height > sHeight) {
            const sourceHeight = backgroundBuf.width / canvasRatio;
            const sy = (backgroundBuf.height - sourceHeight) / 2;
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sourceHeight, 0, 0, dim.width, dim.height);
            ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)';
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sourceHeight, 0, 0, dim.width, dim.height);
        } else {
            const sourceWidth = backgroundBuf.height * canvasRatio;
            const sx = (backgroundBuf.width - sourceWidth) / 2;
            ctx.drawImage(backgroundBuf, sx, 0, sourceWidth, backgroundBuf.height, 0, 0, dim.width, dim.height);
            ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)';
            ctx.drawImage(backgroundBuf, sx, 0, sourceWidth, backgroundBuf.height, 0, 0, dim.width, dim.height);
        }
        ctx.filter = 'none'; 
    } else {
        // ✅ STRICT FALLBACK: If both banner and avatar fail, fill background with #888888
        ctx.fillStyle = '#888888';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // Dark Overlay
    ctx.fillStyle = backgroundBuf ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // ==========================================
    // INNER FRAME BORDER 
    // ==========================================
    ctx.lineWidth = 40;

    let borderStyle = 'rgba(0, 0, 0, 0.3)'; // Default Grey

    if (themeColors && Array.isArray(themeColors) && themeColors.length === 2) {
        const primaryHex = intToHex(themeColors[0]);
        const accentHex = intToHex(themeColors[1]);

        if (primaryHex && accentHex) {
            const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
            gradient.addColorStop(0, primaryHex);  
            gradient.addColorStop(1, accentHex);   
            borderStyle = gradient;
        }
    }
    
    ctx.strokeStyle = borderStyle;
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.stroke();


    // ==========================================
    // LAYER 2: AVATAR COMPOSITE
    // ==========================================
    const avatarSize = 400;
    const avatarX = dim.margin + 30;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;
    const centerX = avatarX + avatarRadius;
    const centerY = avatarY + avatarRadius;

    const status = member.presence ? member.presence.status : 'offline';
    const statusMap = {
        online: './pics/discord status/statusonline.png',
        idle: './pics/discord status/statusidle.png',
        dnd: './pics/discord status/statusdnd.png',
        streaming: './pics/discord status/statusstreaming.png',
        invisible: './pics/discord status/statusinvisible.png',
        offline: './pics/discord status/statusinvisible.png'
    };

    // Use safeLoadImage concurrently
    const [mainAvatar, statusImage, decoImage] = await Promise.all([
        safeLoadImage(user.displayAvatarURL({ extension: 'png', size: 512 }), 2000),
        safeLoadImage(statusMap[status] || statusMap.offline, 1500),
        user.avatarDecorationURL() ? safeLoadImage(user.avatarDecorationURL({ extension: 'png', size: 512 }), 2000) : null
    ]);

    const compositeCanvas = createCanvas(dim.width, dim.height);
    const cCtx = compositeCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';

    cCtx.save();
    cCtx.beginPath();
    cCtx.arc(centerX, centerY, avatarRadius, 0, Math.PI * 2);
    cCtx.clip();

    let avatarAssetBuffer = null;
    let isFallback = false;

    // ✅ STRICT FALLBACK: If avatar errors or times out
    if (mainAvatar) {
        cCtx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    } else {
        isFallback = true;
        // 1. Draw #888888 on the main canvas (will be naturally clipped into a circle)
        cCtx.fillStyle = '#888888';
        cCtx.fillRect(avatarX, avatarY, avatarSize, avatarSize);
        
        // 2. Export a SQUARE #888888 thumbnail specifically for the Embed Accessory
        const fallbackThumbCanvas = createCanvas(avatarSize, avatarSize);
        const ftCtx = fallbackThumbCanvas.getContext('2d');
        ftCtx.fillStyle = '#888888';
        ftCtx.fillRect(0, 0, avatarSize, avatarSize);
        avatarAssetBuffer = fallbackThumbCanvas.toBuffer('image/png');
    }
    cCtx.restore();

    if (decoImage) {
        const scaledDeco = avatarSize * 1.2;
        const decoX = avatarX - (scaledDeco - avatarSize) / 2;
        const decoY = avatarY - (scaledDeco - avatarSize) / 2;
        cCtx.drawImage(decoImage, decoX, decoY, scaledDeco, scaledDeco);
    }

    const statusSize = 95; 
    if (statusImage) {
        const offset = 141; 
        const holeX = (centerX + offset);
        const holeY = (centerY + offset);
        const invisibleRadius = (statusSize / 2) + 20; 

        cCtx.save();
        cCtx.globalCompositeOperation = 'destination-out'; 
        cCtx.beginPath();
        cCtx.arc(holeX, holeY, invisibleRadius, 0, Math.PI * 2);
        cCtx.fill(); 
        cCtx.restore();
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(compositeCanvas, 0, 0);
    ctx.restore();
    ctx.drawImage(compositeCanvas, 0, 0); 

    if (statusImage) {
        const offset = 141;
        const holeX = (centerX + offset);
        const holeY = (centerY + offset);
        const iconX = holeX - (statusSize / 2);
        const iconY = holeY - (statusSize / 2);
        
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;
        ctx.drawImage(statusImage, iconX, iconY, statusSize, statusSize);
        ctx.restore();
    }

    // ==========================================
    // LAYER 3.5: PROFILE BADGES BOX (TOP RIGHT)
    // ==========================================
    const v9Data = await fetchAdvancedProfile(member.id).catch(() => null);
    if (v9Data && v9Data.badges && v9Data.badges.length > 0) {
        const badgeUrls = v9Data.badges.map(b => `https://cdn.discordapp.com/badge-icons/${b.icon}.png`);
        const loadedBadges = await Promise.all(badgeUrls.map(url => safeLoadImage(url, 1500)));
        const validBadges = loadedBadges.filter(img => img !== null);

        if (validBadges.length > 0) {
            const badgeSize = 75;      
            const badgePaddingX = 25;  
            const badgeGap = 2;        
            const badgeBoxHeight = 95; 
            const marginRight = 50;
            const marginTop = 50;

            const badgeBoxWidth = (badgePaddingX * 2) + (validBadges.length * badgeSize) + ((validBadges.length - 1) * badgeGap);
            const badgeBoxX = (dim.width - marginRight) - badgeBoxWidth;
            const badgeBoxY = marginTop;
            const boxCenterAxisY = badgeBoxY + (badgeBoxHeight / 2);

            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
            ctx.beginPath();
            ctx.roundRect(badgeBoxX, badgeBoxY, badgeBoxWidth, badgeBoxHeight, 25);
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
            ctx.shadowBlur = 5;
            ctx.shadowOffsetX = 5; 
            ctx.shadowOffsetY = 5; 

            let currentBadgeX = badgeBoxX + badgePaddingX;
            for (const badgeImg of validBadges) {
                const imgY = boxCenterAxisY - (badgeSize / 2);
                ctx.drawImage(badgeImg, currentBadgeX, imgY, badgeSize, badgeSize);
                currentBadgeX += badgeSize + badgeGap;
            }
            ctx.restore();
        }
    }

    // ==========================================
    // LAYER 4: TEXT & INFO
    // ==========================================
    const idText = `ID: ${user.id}`;
    ctx.font = '50px "Prima Sans Regular", "ReemKufi Bold", sans-serif';
    
    const idMetrics = ctx.measureText(idText);
    const idPaddingX = 25; 
    const idBoxHeight = 85; 
    const marginRight = 50;
    const marginBottom = 50;
    
    const boxCenterAxisY = dim.height - marginBottom - (idBoxHeight / 2);
    const idBoxWidth = idMetrics.width + (idPaddingX * 2);
    const idBoxX = (dim.width - marginRight) - idBoxWidth;
    const idBoxY = boxCenterAxisY - (idBoxHeight / 2);

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
    ctx.beginPath();
    ctx.roundRect(idBoxX, idBoxY, idBoxWidth, idBoxHeight, 25);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 5; 
    ctx.shadowOffsetY = 5; 
    ctx.fillStyle = '#DADADA'; 
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle'; 
    ctx.fillText(idText, (dim.width - marginRight) - idPaddingX, boxCenterAxisY); 
    ctx.restore();

    const textX = avatarX + avatarSize + 70;
    const maxAvailableWidth = dim.width - textX - 50; 

    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 5; 
    ctx.shadowOffsetY = 5; 

    let currentY = dim.height / 2 - 15;
    const displayName = user.globalName || user.username;
    
    const fontStack = `"gg sans Bold", "Times Bold", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;
    const baseDisplaySize = 115;

    ctx.font = `bold ${baseDisplaySize}px ${fontStack}`;
    const displayNameWidth = ctx.measureText(displayName).width;
    const displayScale = Math.min(1, maxAvailableWidth / displayNameWidth);
    
    ctx.font = `bold ${baseDisplaySize * displayScale}px ${fontStack}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayName, textX, currentY);

    currentY += 115;
    
    const baseUsernameSize = 95;
    const baseTagSize = 63;       
    const baseBoxHeight = 105;    
    const baseBadgeSize = 77;     
    const basePadding = 25;       
    const baseMarginSep = 25; 
    const baseContentGap = 18;    
    const baseRadius = 22;        

    let tagText = (user.discriminator && user.discriminator !== '0') 
        ? `${user.username}#${user.discriminator}` 
        : `@${user.username}`;
    
    const guildInfo = user.primaryGuild;
    const hasGuild = (guildInfo && guildInfo.tag);

    ctx.font = `${baseUsernameSize}px "Prima Sans Regular", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;
    const usernameWidth = ctx.measureText(tagText).width;

    let totalNeededWidth = usernameWidth;
    let guildTagWidth = 0;
    let badgeURL = null;
    let hasBadge = false;

    if (hasGuild) {
        ctx.font = `${baseTagSize}px "Prima Sans Regular", ${fontStack}`; 
        guildTagWidth = ctx.measureText(guildInfo.tag).width;

        if (typeof user.guildTagBadgeURL === 'function') {
             badgeURL = user.guildTagBadgeURL({ extension: 'png', size: 128 });
        } else if (guildInfo.badge && guildInfo.identityGuildId) {
             badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=128`;
        }
        hasBadge = !!(badgeURL && guildInfo.badge);

        let boxWidth = (basePadding * 2) + guildTagWidth;
        if (hasBadge) boxWidth += baseBadgeSize + baseContentGap;
        
        totalNeededWidth += baseMarginSep + boxWidth;
    }

    const totalChars = tagText.length + (hasGuild ? guildInfo.tag.length : 0);
    const widthScale = maxAvailableWidth / totalNeededWidth;
    
    let sizeAdjustmentScale = 1;
    if (totalChars > 5) {
        sizeAdjustmentScale = (baseUsernameSize - 5) / baseUsernameSize;
    }

    const bottomScale = Math.min(sizeAdjustmentScale, widthScale);

    ctx.font = `${baseUsernameSize * bottomScale}px "Prima Sans Regular", sans-serif`;
    ctx.fillStyle = '#dadada'; 
    ctx.fillText(tagText, textX, currentY);

    if (hasGuild) {
        const fUsernameWidth = ctx.measureText(tagText).width;
        
        const fTagSize = baseTagSize * bottomScale;
        ctx.font = `${fTagSize}px "Prima Sans Regular", ${fontStack}`; 
        const fTagWidth = ctx.measureText(guildInfo.tag).width;
        
        const fPadding = basePadding * bottomScale;
        const fContentGap = baseContentGap * bottomScale;
        const fBadgeSize = baseBadgeSize * bottomScale;
        
        let fBoxWidth = (fPadding * 2) + fTagWidth;
        if (hasBadge) fBoxWidth += fBadgeSize + fContentGap;

        const fMarginSep = baseMarginSep * bottomScale;
        const boxX = textX + fUsernameWidth + fMarginSep;
        
        const fBoxHeight = baseBoxHeight * bottomScale;
        const verticalAdjustment = 30 * bottomScale; 
        const verticalCenterY = currentY - verticalAdjustment; 
        const boxY = verticalCenterY - (fBoxHeight / 2);

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#404249'; 
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, fBoxWidth, fBoxHeight, baseRadius * bottomScale); 
        ctx.fill();
        ctx.restore();

        let currentContentX = boxX + fPadding;
        const contentCenterY = boxY + (fBoxHeight / 2); 

        if (hasBadge) {
            const badgeImg = await safeLoadImage(badgeURL, 2000);
            if (badgeImg) {
                const badgeY = contentCenterY - (fBadgeSize / 2);
                ctx.drawImage(badgeImg, currentContentX, badgeY, fBadgeSize, fBadgeSize);
                currentContentX += fBadgeSize + fContentGap;
            }
        }

        ctx.fillStyle = '#ffffff'; 
        ctx.textBaseline = 'middle'; 
        ctx.fillText(guildInfo.tag, currentContentX, contentCenterY - 4);
        ctx.textBaseline = 'alphabetic'; 
    }

    // ==========================================
    // LAYER 5: CROWN BADGE
    // ==========================================
    ctx.restore(); 

    const badgeImage = await safeLoadImage('./pics/logo/NEW_sign.png', 1000);

    if (badgeImage) {
        const badgeWidth = 160; 
        const badgeHeight = 98;
        const avatarCenterX = dim.margin + 30 + avatarRadius;
        const badgeX = avatarCenterX - badgeWidth;
        const badgeY = topOffset - (badgeHeight / 2) + 10;

        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    // ✅ RETURN STATEMENT updated to support the test command fallback thumbnail!
    return {
        welcomeImage: canvas.toBuffer('image/png'),
        avatarAsset: avatarAssetBuffer,
        isFallback: isFallback
    };
}

module.exports = { createWelcomeImage };
