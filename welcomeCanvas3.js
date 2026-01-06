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
    const user = await member.user.fetch(true);

    const dim = {
        height: 606,
        width: 1770,
        margin: 100
    };

    // 1. Setup Canvas
    const topOffset = 50;
    const canvas = createCanvas(dim.width, dim.height + topOffset);
    const ctx = canvas.getContext('2d');

    // ==========================================
    // LAYER 1: THE CARD
    // ==========================================
    ctx.save(); 
    ctx.translate(0, topOffset);

    // Card Shape & Clip
    const cornerRadius = 80;
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip(); 

    // --- Background ---
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
    // AVATAR & STATUS LOGIC
    // ==========================================

    // 1. Prepare Status Data
    const status = member.presence ? member.presence.status : 'offline';
    const statusMap = {
        online: './pics/discord status/online.png',
        idle: './pics/discord status/idle.png',
        dnd: './pics/discord status/dnd.png',
        streaming: './pics/discord status/streaming.png',
        invisible: './pics/discord status/invisible.png',
        offline: './pics/discord status/invisible.png'
    };

    const statusImage = await loadImage(statusMap[status] || statusMap.offline).catch(() => null);

    // 2. Calculate Coordinates
    const avatarSize = 400;
    const avatarX = dim.margin + 30;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;
    
    const centerX = avatarX + avatarRadius;
    const centerY = avatarY + avatarRadius;

    // Status Coordinates
    const statusSize = 100;
    // Offset for 45 degrees (bottom-right)
    const offset = 141; // ≈ 200 * 0.707
    const statusX = (centerX + offset) - (statusSize / 2);
    const statusY = (centerY + offset) - (statusSize / 2);
    
    // The "Hole" Radius (Status Size / 2 + Border Thickness)
    const cutRadius = (statusSize / 2) + 8; 

    // 3. Define the "Avatar Shape" (Circle minus Status Hole)
    // We use this function for both the Shadow and the Image clipping
    const defineAvatarShape = () => {
        ctx.beginPath();
        // Outer Circle (Avatar) - Clockwise (false)
        ctx.arc(centerX, centerY, avatarRadius, 0, Math.PI * 2, false);
        
        // Inner Circle (Status Cutout) - Counter-Clockwise (true)
        // This creates a hole in the fill/clip
        if (statusImage) {
            ctx.arc(statusX + statusSize/2, statusY + statusSize/2, cutRadius, 0, Math.PI * 2, true);
        }
        ctx.closePath();
    };

    // --- Draw Avatar Shadow ---
    ctx.save();
    defineAvatarShape();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#000000';
    ctx.fill(); // Fills the avatar shape, leaving the status hole empty
    ctx.restore();

    // --- Draw Avatar Image ---
    const mainAvatar = await loadImage(member.displayAvatarURL({ extension: 'png', size: 512 }));
    
    ctx.save();
    defineAvatarShape();
    ctx.clip(); // Clips drawing to the shape (Circle minus Hole)
    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // --- Draw Status Icon ---
    // Now we draw the status exactly in the hole we left
    if (statusImage) {
        ctx.drawImage(statusImage, statusX, statusY, statusSize, statusSize);
    }

    // --- Decoration (Optional: Drawn on top) ---
    const decoURL = user.avatarDecorationURL({ extension: 'png', size: 512 });
    if (decoURL) {
        const decoImage = await loadImage(decoURL).catch(() => null);
        if (decoImage) {
            const scaledDeco = avatarSize * 1.2;
            const decoX = avatarX - (scaledDeco - avatarSize) / 2;
            const decoY = avatarY - (scaledDeco - avatarSize) / 2;
            ctx.drawImage(decoImage, decoX, decoY, scaledDeco, scaledDeco);
        }
    }

    // --- Text ---
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Server Name
    ctx.font = 'bold 60px "Noto Sans", "ReemKufi Bold", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText("A2-Q Realm", dim.width - 70, dim.height - 70);

    // Display Name
    const textX = avatarX + avatarSize + 70;
    let currentY = dim.height / 2 - 15;
    
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 120px "gg sans Bold", "Geeza Bold", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif';
    
    const displayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim() || user.username;
    ctx.fillText(displayName, textX, currentY);

    // Username Tag
    currentY += 115;
    ctx.font = '100px "SF Pro Text Regular", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    const tag = (user.discriminator && user.discriminator !== '0') ? `${user.username}#${user.discriminator}` : `@${user.username}`;
    ctx.fillText(tag, textX, currentY);

    // ==========================================
    // LAYER 2: THE BADGE
    // ==========================================
    ctx.restore(); 

    const badgeImage = await loadImage('./new-icon.png').catch(() => null);

    if (badgeImage) {
        const badgeWidth = 200; 
        const badgeHeight = 100; 
        const badgeX = (dim.margin + 30 + avatarRadius) - (badgeWidth / 2);
        const badgeY = topOffset - (badgeHeight / 2);
        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };
