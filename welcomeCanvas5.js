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

    // --- ID Box ---
    const idText = `ID: ${member.id}`;
    ctx.font = '50px "Prima Sans Regular", "ReemKufi Bold", sans-serif';
    
    const idMetrics = ctx.measureText(idText);
    const idPaddingX = 30; 
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
    ctx.roundRect(idBoxX, idBoxY, idBoxWidth, idBoxHeight, 30);
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

    // --- Display Name ---
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 5; 
    ctx.shadowOffsetY = 5; 

    const textX = avatarX + avatarSize + 70;
    let currentY = dim.height / 2 - 15;
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 115px "gg sans Bold", "Geeza Bold", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif';
    
    const displayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim() || user.username;
    ctx.fillText(displayName, textX, currentY);

    // ==================================================================
    // MODIFIED: USERNAME & GUILD TAG (With solid background box)
    // ==================================================================

    currentY += 115;
    ctx.font = '95px "Prima Sans Regular", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    
    // 1. Draw Username
    let tagText = (user.discriminator && user.discriminator !== '0') 
        ? `${user.username}#${user.discriminator}` 
        : `@${user.username}`;
    
    ctx.fillText(tagText, textX, currentY);

    // 2. Draw Guild Tag Box
    const guildInfo = user.primaryGuild;

    if (guildInfo && guildInfo.tag) {
        const usernameWidth = ctx.measureText(tagText).width;

        // --- Configuration for reduced size and box ---
        const tagFontSize = 65; // Reduced font size
        const badgeSize = 65;   // Reduced badge size
        const boxHeight = 95;   // Height of the container box
        const boxPaddingX = 30; // Padding inside the box
        const contentGap = 15;  // Gap between badge and text inside box
        const marginFromUsername = 40; // Gap outside box next to username
        const boxColor = '#404249'; // Requested solid color
        const boxRadius = 30;   // Rounded corners

        // Set font temporarily to measure tag width at new size
        ctx.font = `${tagFontSize}px "Prima Sans Regular", sans-serif`;
        const tagWidth = ctx.measureText(guildInfo.tag).width;

        // Determine Badge URL
        let badgeURL = null;
        if (typeof user.guildTagBadgeURL === 'function') {
             badgeURL = user.guildTagBadgeURL({ extension: 'png', size: 128 });
        } else if (guildInfo.badge && guildInfo.identityGuildId) {
             badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=128`;
        }

        // Calculate total box width needed
        let boxWidth = boxPaddingX * 2 + tagWidth;
        if (badgeURL && guildInfo.badge) {
             boxWidth += badgeSize + contentGap;
        }

        // Calculate Box Positions
        const boxX = textX + usernameWidth + marginFromUsername;
        // Estimate vertical center of the main 95px font (roughly 30px up from baseline)
        const verticalCenterY = currentY - 30;
        const boxY = verticalCenterY - (boxHeight / 2);

        // --- DRAW BOX BACKGROUND ---
        ctx.save();
        // Ensure no shadow on this box for a solid flat look
        ctx.shadowBlur = 0; 
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = boxColor;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, boxRadius);
        ctx.fill();
        ctx.restore();

        // --- DRAW CONTENT INSIDE BOX ---
        let currentContentX = boxX + boxPaddingX;
        // Calculate Y center for content inside the box using middle baseline
        const contentCenterY = boxY + (boxHeight / 2);

        // Draw Badge Image
        if (badgeURL && guildInfo.badge) {
            const badgeImg = await loadImage(badgeURL).catch(err => null);
            if (badgeImg) {
                // Center badge vertically in box
                const badgeY = contentCenterY - (badgeSize / 2);
                ctx.drawImage(badgeImg, currentContentX, badgeY, badgeSize, badgeSize);
                currentContentX += badgeSize + contentGap;
            }
        }

        // Draw Tag Text
        ctx.fillStyle = '#ffffff'; // White text for better contrast on #404249
        ctx.font = `${tagFontSize}px "Prima Sans Regular", sans-serif`;
        ctx.textBaseline = 'middle'; // Switch baseline for easier centering in box
        ctx.fillText(guildInfo.tag, currentContentX, contentCenterY);

        // Restore text baseline
        ctx.textBaseline = 'alphabetic';
    }

    // --- Crown Badge ---
    ctx.restore(); 
    const badgeImage = await loadImage('./pics/logo/A2-Q-crown.png').catch(() => null);

    if (badgeImage) {
        const badgeWidth = 200; 
        const badgeHeight = 100; 
        
        const avatarCenterX = dim.margin + 30 + avatarRadius;
        const badgeX = avatarCenterX - badgeWidth;
        const badgeY = topOffset - (badgeHeight / 2);
        
        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };
