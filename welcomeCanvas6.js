const { createCanvas, loadImage } = require('@napi-rs/canvas');

// --- Helper 1: Darken/Lighten Hex Color ---
function shadeColor(color, percent) {
    var f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = f >> 8 & 0x00FF,
        B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

// --- Helper 2: Check if Color is Light or Dark ---
function isColorLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128;
}

async function createWelcomeImage(member) {
    // Force fetch to ensure 'primaryGuild' data is loaded
    const user = await member.user.fetch(true);

    const dim = {
        height: 606,
        width: 1770,
        margin: 100
    };

    const topOffset = 50;
    const canvas = createCanvas(dim.width, dim.height + topOffset);
    const ctx = canvas.getContext('2d');
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ==========================================
    // LAYER 1: THE CARD BACKGROUND
    // ==========================================
    ctx.save(); 
    ctx.translate(0, topOffset);

    // Card Shape
    const cornerRadius = 80;
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip(); 

    // --- Background Logic ---
    const bannerURL = user.bannerURL({ extension: 'png', size: 2048 });
    let backgroundBuf = null;

    if (bannerURL) {
        backgroundBuf = await loadImage(bannerURL).catch(() => null);
    }
    if (!backgroundBuf) {
        const avatarURL = member.displayAvatarURL({ extension: 'png', size: 2048 });
        backgroundBuf = await loadImage(avatarURL).catch(() => null);
    }

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
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // --- Overlay ---
    ctx.fillStyle = bannerURL ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // --- Inner Frame ---
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

    const compositeCanvas = createCanvas(dim.width, dim.height);
    const cCtx = compositeCanvas.getContext('2d');
    cCtx.imageSmoothingEnabled = true;
    cCtx.imageSmoothingQuality = 'high';

    // A. Draw Avatar
    cCtx.save();
    cCtx.beginPath();
    cCtx.arc(centerX, centerY, avatarRadius, 0, Math.PI * 2);
    cCtx.clip();
    cCtx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    cCtx.restore();

    // B. Draw Decoration
    if (decoImage) {
        const scaledDeco = avatarSize * 1.2;
        const decoX = avatarX - (scaledDeco - avatarSize) / 2;
        const decoY = avatarY - (scaledDeco - avatarSize) / 2;
        cCtx.drawImage(decoImage, decoX, decoY, scaledDeco, scaledDeco);
    }

    // C. Invisible Spot for Status
    const statusSize = 95; 
    if (statusImage) {
        const offset = 141; // 45 degrees
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

    // Draw Composite to Main Canvas
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 25;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(compositeCanvas, 0, 0);
    ctx.restore();
    ctx.drawImage(compositeCanvas, 0, 0);

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


    // ==================================================================
    //  SAFE TEXT ZONE LOGIC (SCALING FOR BOTH LINES)
    // ==================================================================
    
    // 1. Define Safe Zone
    // 100(margin) + 30(avatarX) + 400(avatarSize) + 70(Gap) = 600px
    const textX = avatarX + avatarSize + 70;
    
    // 50px Margin from Right Edge of card
    const maxAvailableWidth = dim.width - textX - 50; 

    // --- A. DISPLAY NAME / GLOBAL NAME (Top Line) ---
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 5; 
    ctx.shadowOffsetY = 5; 

    let currentY = dim.height / 2 - 15;
    
    // Use Global Name if available, otherwise Username
    const displayName = user.globalName || user.username;
    
    // 1. Font Stack
    const fontStack = `"gg sans Bold", "Geeza Bold", "SFArabic", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;
    
    // 2. Measure & Scale
    const baseDisplaySize = 115;
    ctx.font = `bold ${baseDisplaySize}px ${fontStack}`;
    
    const displayNameWidth = ctx.measureText(displayName).width;
    const displayScale = Math.min(1, maxAvailableWidth / displayNameWidth);
    
    // 3. Draw Scaled Text
    const fDisplaySize = baseDisplaySize * displayScale;
    ctx.font = `bold ${fDisplaySize}px ${fontStack}`;
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayName, textX, currentY);


    // --- B. USERNAME & GUILD TAG (Bottom Line) ---
    currentY += 115;
    
    // Define Base Sizes
    const baseUsernameSize = 95;
    const baseTagSize = 65;
    const baseBoxHeight = 95;
    const baseBadgeSize = 65;
    const basePadding = 20;  
    const baseSepPadding = 25; 
    const baseMarginSep = 25; 
    const baseContentGap = 15; 
    const baseRadius = 20; // 20px Corner Radius

    let tagText = (user.discriminator && user.discriminator !== '0') 
        ? `${user.username}#${user.discriminator}` 
        : `@${user.username}`;
    
    const guildInfo = user.primaryGuild;
    const hasGuild = (guildInfo && guildInfo.tag);

    // Measure Username
    ctx.font = `${baseUsernameSize}px "Prima Sans Regular", sans-serif`;
    const usernameWidth = ctx.measureText(tagText).width;

    let totalNeededWidth = usernameWidth;
    let guildTagWidth = 0;
    let badgeURL = null;
    let hasBadge = false;

    if (hasGuild) {
        // Measure Separator
        const dotWidth = ctx.measureText("•").width;
        
        // Measure Tag
        ctx.font = `${baseTagSize}px "Prima Sans Regular", ${fontStack}`;
        guildTagWidth = ctx.measureText(guildInfo.tag).width;

        // Check Badge
        if (typeof user.guildTagBadgeURL === 'function') {
             badgeURL = user.guildTagBadgeURL({ extension: 'png', size: 128 });
        } else if (guildInfo.badge && guildInfo.identityGuildId) {
             badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=128`;
        }
        hasBadge = !!(badgeURL && guildInfo.badge);

        // Calculate Box Width
        let boxWidth = (basePadding * 2) + guildTagWidth;
        if (hasBadge) {
             boxWidth += baseBadgeSize + baseContentGap;
        }

        totalNeededWidth += baseSepPadding + dotWidth + baseMarginSep + boxWidth;
    }

    // Calculate Scale for Bottom Line
    const bottomScale = Math.min(1, maxAvailableWidth / totalNeededWidth);

    // Apply Scale to Variables
    const fUsernameSize = baseUsernameSize * bottomScale;
    const fTagSize = baseTagSize * bottomScale;
    const fBoxHeight = baseBoxHeight * bottomScale;
    const fPadding = basePadding * bottomScale;
    const fSepPadding = baseSepPadding * bottomScale;
    const fMarginSep = baseMarginSep * bottomScale;
    const fContentGap = baseContentGap * bottomScale;
    const fBadgeSize = baseBadgeSize * bottomScale;
    const fRadius = baseRadius * bottomScale;

    // Draw Username
    ctx.font = `${fUsernameSize}px "Prima Sans Regular", sans-serif`;
    ctx.fillStyle = '#dadada'; 
    ctx.fillText(tagText, textX, currentY);

    if (hasGuild) {
        const fUsernameWidth = ctx.measureText(tagText).width;
        
        // Separator
        const separatorX = textX + fUsernameWidth + fSepPadding;
        ctx.fillStyle = '#dadada'; 
        ctx.fillText("•", separatorX, currentY);
        const fSeparatorWidth = ctx.measureText("•").width;

        // Recalculate Box Width Scaled
        ctx.font = `${fTagSize}px "Prima Sans Regular", "SFArabic", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif`;
        const fTagWidth = ctx.measureText(guildInfo.tag).width;
        
        let fBoxWidth = (fPadding * 2) + fTagWidth;
        if (hasBadge) {
             fBoxWidth += fBadgeSize + fContentGap;
        }

        // Positions
        const boxX = separatorX + fSeparatorWidth + fMarginSep;
        const verticalAdjustment = 30 * bottomScale; 
        const verticalCenterY = currentY - verticalAdjustment; 
        const boxY = verticalCenterY - (fBoxHeight / 2);

        // Draw Box Background
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;

        ctx.fillStyle = '#404249'; 
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, fBoxWidth, fBoxHeight, fRadius);
        ctx.fill();
        ctx.restore();

        // Draw Content Inside Box
        let currentContentX = boxX + fPadding;
        const contentCenterY = boxY + (fBoxHeight / 2); 

        if (hasBadge) {
            const badgeImg = await loadImage(badgeURL).catch(err => null);
            if (badgeImg) {
                // Badge Logic (UNCHANGED)
                const badgeY = contentCenterY - (fBadgeSize / 2);
                ctx.drawImage(badgeImg, currentContentX, badgeY, fBadgeSize, fBadgeSize);
                currentContentX += fBadgeSize + fContentGap;
            }
        }

        ctx.fillStyle = '#ffffff'; 
        ctx.textBaseline = 'middle'; 
        
        // === CHANGED LINE ===
        // Subtracting 4 pixels from Y to move text UP slightly
        ctx.fillText(guildInfo.tag, currentContentX, contentCenterY - 4);

        ctx.textBaseline = 'alphabetic'; 
    }

    // --- Crown Badge (Logo) ---
    ctx.restore();
    const badgeImage = await loadImage('./pics/logo/A2-Q.png').catch(() => null);

    if (badgeImage) {
        // 1. New Dimensions
        const badgeWidth = 130;
        const badgeHeight = 80;

        // 2. Horizontal Position (X-Axis)
        // We calculate the center of the avatar, then subtract half the badge width
        // so the badge is perfectly centered horizontally on top of the Avatar.
        const avatarCenterX = dim.margin + 30 + avatarRadius;
        const badgeX = avatarCenterX - (badgeWidth / 2);

        // 3. Vertical Position (Y-Axis) - "Middle of inner frame line"
        // The inner frame line is at 'topOffset'.
        // To align the badge's middle with that line, we subtract half the badge height.
        // Result: 40px of the badge is above the line, 40px is below.
        const badgeY = topOffset - (badgeHeight / 2);

        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    return canvas.toBuffer('image/png');
}
