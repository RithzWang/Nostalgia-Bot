const { createCanvas, loadImage } = require('@napi-rs/canvas');

// ==========================================
// HELPERS
// ==========================================

function intToHex(intColor) {
    if (intColor === null || intColor === undefined) return null;
    return '#' + intColor.toString(16).padStart(6, '0');
}

function shadeColor(color, percent) {
    var f = parseInt(color.slice(1), 16),
        t = percent < 0 ? 0 : 255,
        p = percent < 0 ? percent * -1 : percent,
        R = f >> 16,
        G = f >> 8 & 0x00FF,
        B = f & 0x0000FF;
    return "#" + (0x1000000 + (Math.round((t - R) * p) + R) * 0x10000 + (Math.round((t - G) * p) + G) * 0x100 + (Math.round((t - B) * p) + B)).toString(16).slice(1);
}

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

async function createWelcomeImage(member, themeColors = null) {
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
    // LAYER 1: BACKGROUND
    // ==========================================
    ctx.save(); 
    ctx.translate(0, topOffset);

    const cornerRadius = 80;
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip(); 

    const bannerURL = user.bannerURL({ extension: 'png', size: 2048 });
    const avatarURL = member.displayAvatarURL({ extension: 'png', size: 2048 });
    
    let backgroundBuf = null;
    if (bannerURL) backgroundBuf = await loadImage(bannerURL).catch(() => null);
    if (!backgroundBuf) backgroundBuf = await loadImage(avatarURL).catch(() => null);

    if (backgroundBuf) {
        const canvasRatio = dim.width / dim.height;
        const sHeight = backgroundBuf.width / canvasRatio;
        if (backgroundBuf.height > sHeight) {
            const sy = (backgroundBuf.height - sHeight) / 2;
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sHeight, 0, 0, dim.width, dim.height);
            ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)';
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sHeight, 0, 0, dim.width, dim.height);
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

    ctx.fillStyle = bannerURL ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // ==========================================
    // BORDER
    // ==========================================
    ctx.lineWidth = 40;
    const isNitro = (user.banner !== null) || (user.avatar && user.avatar.startsWith('a_'));
    let borderStyle = 'rgba(0,0,0,0.3)';

    if (themeColors && Array.isArray(themeColors) && themeColors.length === 2) {
        const primaryHex = intToHex(themeColors[0]);
        const accentHex = intToHex(themeColors[1]);
        if (primaryHex && accentHex) {
            const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
            gradient.addColorStop(0, primaryHex);
            gradient.addColorStop(1, accentHex);
            borderStyle = gradient;
        }
    } else if (user.hexAccentColor && isNitro) {
        const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
        gradient.addColorStop(0, user.hexAccentColor);
        const isLight = isColorLight(user.hexAccentColor);
        gradient.addColorStop(1, shadeColor(user.hexAccentColor, isLight ? -0.6 : 0.6));
        borderStyle = gradient;
    }
    ctx.strokeStyle = borderStyle;
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.stroke();

    // ==========================================
    // AVATAR
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

    cCtx.save();
    cCtx.beginPath();
    cCtx.arc(centerX, centerY, avatarRadius, 0, Math.PI * 2);
    cCtx.clip();
    cCtx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
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
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 25;
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
    // TEXT LAYER (iOS STYLE SHADOWS)
    // ==========================================
    const idText = `ID: ${member.id}`;
    ctx.font = '50px "Prima Sans Regular", sans-serif';
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
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
    ctx.beginPath();
    ctx.roundRect(idBoxX, idBoxY, idBoxWidth, idBoxHeight, 25);
    ctx.fill();
    ctx.restore();

    // ID Text (iOS shadow)
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#DADADA'; 
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle'; 
    ctx.fillText(idText, (dim.width - marginRight) - idPaddingX, boxCenterAxisY); 
    ctx.restore();

    const textX = avatarX + avatarSize + 70;
    const maxAvailableWidth = dim.width - textX - 50; 
    let currentY = dim.height / 2 - 15;
    const displayName = user.globalName || user.username;

    const fontStack = `"gg sans Bold", "Times Bold", "Thonburi", "Apple Gothic", "Hiragino Sans", sans-serif`;
    const baseDisplaySize = 115;

    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.font = `bold ${baseDisplaySize}px ${fontStack}`;
    const displayNameWidth = ctx.measureText(displayName).width;
    const displayScale = Math.min(1, maxAvailableWidth / displayNameWidth);
    ctx.font = `bold ${baseDisplaySize * displayScale}px ${fontStack}`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(displayName, textX, currentY);

    // Username line
    currentY += 115;
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    const baseUsernameSize = 95;
    let tagText = (user.discriminator && user.discriminator !== '0') 
        ? `${user.username}#${user.discriminator}` 
        : `@${user.username}`;
    ctx.font = `${baseUsernameSize}px "Prima Sans Regular", sans-serif`;
    ctx.fillStyle = '#dadada'; 
    ctx.fillText(tagText, textX, currentY);

    ctx.restore();

    const badgeImage = await loadImage('./pics/logo/A2-Q.png').catch(() => null);
    if (badgeImage) {
        const badgeWidth = 160; 
        const badgeHeight = 98;
        const avatarCenterX = dim.margin + 30 + avatarRadius;
        const badgeX = avatarCenterX - badgeWidth;
        const badgeY = topOffset - (badgeHeight / 2) + 10;
        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };