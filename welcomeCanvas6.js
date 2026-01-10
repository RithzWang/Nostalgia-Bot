const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ==========================================
// HELPERS
// ==========================================

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

async function createWelcomeImage(member) {
    // 1. Setup & Dimensions
    const user = await member.user.fetch(true);

    const dim = {
        height: 606,
        width: 1770,
        margin: 100
    };

    // Increased to 80 to prevent badge clipping
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

    // Fetch Images (Banner or Avatar fallback)
    const bannerURL = user.bannerURL({ extension: 'png', size: 2048 });
    const avatarURL = member.displayAvatarURL({ extension: 'png', size: 2048 });
    
    let backgroundBuf = null;
    if (bannerURL) {
        backgroundBuf = await loadImage(bannerURL).catch(() => null);
    }
    if (!backgroundBuf) {
        backgroundBuf = await loadImage(avatarURL).catch(() => null);
    }

    // Draw Background
    if (backgroundBuf) {
        const canvasRatio = dim.width / dim.height;
        const sHeight = backgroundBuf.width / canvasRatio;

        if (backgroundBuf.height > sHeight) {
            // Portrait/Square source logic
            const sourceHeight = backgroundBuf.width / canvasRatio;
            const sy = (backgroundBuf.height - sourceHeight) / 2;
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sourceHeight, 0, 0, dim.width, dim.height);
            ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)';
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sourceHeight, 0, 0, dim.width, dim.height);
        } else {
            // Landscape source logic
            const sourceWidth = backgroundBuf.height * canvasRatio;
            const sx = (backgroundBuf.width - sourceWidth) / 2;
            ctx.drawImage(backgroundBuf, sx, 0, sourceWidth, backgroundBuf.height, 0, 0, dim.width, dim.height);
            ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)';
            ctx.drawImage(backgroundBuf, sx, 0, sourceWidth, backgroundBuf.height, 0, 0, dim.width, dim.height);
        }
        ctx.filter = 'none'; 
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // Dark Overlay
    ctx.fillStyle = bannerURL ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // Inner Frame Border
    ctx.lineWidth = 40;
    const isNitro = (user.banner !== null) || (user.avatar && user.avatar.startsWith('a_'));

    if (user.hexAccentColor && isNitro) {
        const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
        gradient.addColorStop(0, user.hexAccentColor);
        const isLight = isColorLight(user.hexAccentColor);
        gradient.addColorStop(1, shadeColor(user.hexAccentColor, isLight ? -0.6 : 0.6));
        ctx.strokeStyle = gradient;
    } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    }
    
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

    const [mainAvatar, statusImage, decoImage] = await Promise.all([
        loadImage(member.displayAvatarURL({ extension: 'png', size: 512 })),
        loadImage(statusMap[status] || statusMap.offline).catch(() => null),
        user.avatarDecorationURL() ? loadImage(user.avatarDecorationURL({ extension: 'png', size: 512 })).catch(() => null) : null
    ]);

    // Create Temporary Canvas for Avatar Masking
    const compositeCanvas = createCanvas(dim.width, dim.height);
    const cCtx = compositeCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';

    // A. Draw Round Avatar
    cCtx.save();
    cCtx.beginPath();
    cCtx.arc(centerX, centerY, avatarRadius, 0, Math.PI * 2);
    cCtx.clip();
    cCtx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    cCtx.restore();

    // B. Draw Avatar Decoration
    if (decoImage) {
        const scaledDeco = avatarSize * 1.2;
        const decoX = avatarX - (scaledDeco - avatarSize) / 2;
        const decoY = avatarY - (scaledDeco - avatarSize) / 2;
        cCtx.drawImage(decoImage, decoX, decoY, scaledDeco, scaledDeco);
    }

    // C. Cut Out "Invisible" Spot for Status
    const statusSize = 95; 
    if (statusImage) {
        const offset = 141; // 45 degrees offset
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

    // Draw Composite Avatar to Main Canvas (with Shadow)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(compositeCanvas, 0, 0);
    ctx.restore();
    ctx.drawImage(compositeCanvas, 0, 0); // Draw again for sharpness

    // ==========================================
    // LAYER 3: STATUS ICON
    // ==========================================
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
    // LAYER 4: TEXT & INFO
    // ==========================================

    // --- ID Box (Top Right) ---
    const idText = `ID: ${member.id}`;
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

    // Draw ID Box Background
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
    ctx.beginPath();
    ctx.roundRect(idBoxX, idBoxY, idBoxWidth, idBoxHeight, 25);
    ctx.fill();
    ctx.restore();

    // Draw ID Text
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

    // --- Safe Text Zone Calculation ---
    const textX = avatarX + avatarSize + 70;
    const maxAvailableWidth = dim.width - textX - 50; 

    // --- A. Display Name (Top Line) ---
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 5; 
    ctx.shadowOffsetY = 5; 

    let currentY = dim.height / 2 - 15;
    const displayName = user.globalName || user.username;
    
    const fontStack = `"gg sans Bold", "Geeza Bold", "SFArabic", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;
    const baseDisplaySize = 115;

    ctx.font = `bold ${baseDisplaySize}px ${fontStack}`;
    const displayNameWidth = ctx.measureText(displayName).width;
    const displayScale = Math.min(1, maxAvailableWidth / displayNameWidth);
    
    ctx.font = `bold ${baseDisplaySize * displayScale}px ${fontStack}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayName, textX, currentY);

    // --- B. Username & Guild Tag (Bottom Line) ---
    currentY += 115;
    
    const baseUsernameSize = 95;
    const baseTagSize = 65;
    const baseBoxHeight = 95;
    const baseBadgeSize = 65;
    const basePadding = 20;  
    const baseSepPadding = 25; 
    const baseMarginSep = 25; 
    const baseContentGap = 15; 
    const baseRadius = 20;

    let tagText = (user.discriminator && user.discriminator !== '0') 
        ? `${user.username}#${user.discriminator}` 
        : `@${user.username}`;
    
    const guildInfo = user.primaryGuild;
    const hasGuild = (guildInfo && guildInfo.tag);

    // Calculate Scaling for Bottom Line
    ctx.font = `${baseUsernameSize}px "Prima Sans Regular", sans-serif`;
    const usernameWidth = ctx.measureText(tagText).width;

    let totalNeededWidth = usernameWidth;
    let guildTagWidth = 0;
    let badgeURL = null;
    let hasBadge = false;

    if (hasGuild) {
        // Estimate dot width based on larger size
        const dotScaleFactor = 1.25; 
        ctx.font = `${baseUsernameSize * dotScaleFactor}px "Prima Sans Regular", sans-serif`;
        const dotWidth = ctx.measureText("•").width;

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
        totalNeededWidth += baseSepPadding + dotWidth + baseMarginSep + boxWidth;
    }

    // --- NEW LOGIC: Reduce exactly 10px if > 10 chars, or fit width ---
    const totalChars = tagText.length + (hasGuild ? guildInfo.tag.length : 0);
    const widthScale = maxAvailableWidth / totalNeededWidth;
    
    let sizeAdjustmentScale = 1;

    if (totalChars > 10) {
        // If chars > 10, reduce font size by exactly 10px
        // Original size: 95px. New size: 85px.
        // Scale factor: 85 / 95
        sizeAdjustmentScale = (baseUsernameSize - 10) / baseUsernameSize;
    }

    // Use the 10px reduction, unless the text is SO long that it hits the width limit.
    const bottomScale = Math.min(sizeAdjustmentScale, widthScale);

    // Draw Scaled Username
    ctx.font = `${baseUsernameSize * bottomScale}px "Prima Sans Regular", sans-serif`;
    ctx.fillStyle = '#dadada'; 
    ctx.fillText(tagText, textX, currentY);

    if (hasGuild) {
        const fUsernameWidth = ctx.measureText(tagText).width;
        
        // Separator (1.25x Size)
        const fSepPadding = baseSepPadding * bottomScale;
        const separatorX = textX + fUsernameWidth + fSepPadding;
        
        ctx.save();
        const sepScale = 1.25; 
        ctx.font = `${baseUsernameSize * bottomScale * sepScale}px "Prima Sans Regular", sans-serif`;
        ctx.fillStyle = '#dadada'; 
        ctx.fillText("•", separatorX, currentY);
        const fSeparatorWidth = ctx.measureText("•").width;
        ctx.restore();

        // Draw Guild Box
        const fTagSize = baseTagSize * bottomScale;
        ctx.font = `${fTagSize}px "Prima Sans Regular", ${fontStack}`;
        const fTagWidth = ctx.measureText(guildInfo.tag).width;
        
        const fPadding = basePadding * bottomScale;
        const fContentGap = baseContentGap * bottomScale;
        const fBadgeSize = baseBadgeSize * bottomScale;
        
        let fBoxWidth = (fPadding * 2) + fTagWidth;
        if (hasBadge) fBoxWidth += fBadgeSize + fContentGap;

        const fMarginSep = baseMarginSep * bottomScale;
        const boxX = separatorX + fSeparatorWidth + fMarginSep;
        
        const fBoxHeight = baseBoxHeight * bottomScale;
        const verticalAdjustment = 30 * bottomScale; 
        const verticalCenterY = currentY - verticalAdjustment; 
        const boxY = verticalCenterY - (fBoxHeight / 2);

        // Box Background
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

        // Box Content
        let currentContentX = boxX + fPadding;
        const contentCenterY = boxY + (fBoxHeight / 2); 

        if (hasBadge) {
            const badgeImg = await loadImage(badgeURL).catch(err => null);
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
    ctx.restore(); // Restore global context (remove translation)

    const badgeImage = await loadImage('./pics/logo/A2-Q.png').catch(() => null);

    if (badgeImage) {
        // Badge Configuration
        const badgeWidth = 160; 
        const badgeHeight = 96;

        // Position: X (Right edge touches middle of avatar)
        const avatarCenterX = dim.margin + 30 + avatarRadius;
        const badgeX = avatarCenterX - badgeWidth;

        // Position: Y (Centered on Top Frame Line + 10px down)
        const badgeY = topOffset - (badgeHeight / 2) + 10;

        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };
