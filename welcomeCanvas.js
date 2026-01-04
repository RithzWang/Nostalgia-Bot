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
    // 1. Fetch user to get Banner/Accent/Avatar details
    const user = await member.user.fetch(true);

    const dim = {
        height: 606,
        width: 1770,
        margin: 100
    };

    const canvas = createCanvas(dim.width, dim.height);
    const ctx = canvas.getContext('2d');

    // --- Rounded Rectangle Clip Path --- 
    const cornerRadius = 80;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip();

    // --- 2. Draw Background ---
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
        const sWidth = backgroundBuf.width;
        const sHeight = sWidth / canvasRatio;

        if (backgroundBuf.height > sHeight) {
            const sourceHeight = backgroundBuf.width / canvasRatio;
            const sy = (backgroundBuf.height - sourceHeight) / 2;
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sourceHeight, 0, 0, dim.width, dim.height);
        } else {
            const sourceWidth = backgroundBuf.height * canvasRatio;
            const sx = (backgroundBuf.width - sourceWidth) / 2;
            ctx.drawImage(backgroundBuf, sx, 0, sourceWidth, backgroundBuf.height, 0, 0, dim.width, dim.height);
        }

        // Reduced blur slightly since we don't have the dark overlay anymore
        ctx.filter = bannerURL ? 'blur(2px)' : 'blur(5px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // --- REMOVED: Global Dark Overlay (Section 3) ---
    // The code that made the whole image darker is now gone.

    // --- 4. Inner Frame (NITRO LOGIC) ---
    ctx.save();
    ctx.lineWidth = 40;

    // DETECT NITRO SIGNALS:
    const hasBanner = user.banner !== null;
    const hasAnimatedAvatar = user.avatar && user.avatar.startsWith('a_');
    const isNitro = hasBanner || hasAnimatedAvatar;

    // Apply Logic: Must have Accent Color AND be Nitro
    if (user.hexAccentColor && isNitro) {
        
        const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
        gradient.addColorStop(0, user.hexAccentColor);

        const isLight = isColorLight(user.hexAccentColor);
        const modifier = isLight ? -0.6 : 0.6;

        const secondaryColor = shadeColor(user.hexAccentColor, modifier);
        gradient.addColorStop(1, secondaryColor);

        ctx.strokeStyle = gradient;

    } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    }

    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.stroke();
    ctx.restore();


    // --- 5. Main Avatar ---
    const avatarSize = 400;
    const avatarX = dim.margin + 30;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;

    const mainAvatarURL = member.displayAvatarURL({ extension: 'png', size: 512 });
    const mainAvatar = await loadImage(mainAvatarURL);

    // Shadow
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.restore();

    // Image
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Decoration
    const decoURL = user.avatarDecorationURL({ extension: 'png', size: 512 });
    if (decoURL) {
        const decoImage = await loadImage(decoURL).catch(e => null);
        if (decoImage) {
            const decoScale = 1.2;
            const scaledDecoSize = avatarSize * decoScale;
            const decoOffsetX = avatarX - (scaledDecoSize - avatarSize) / 2;
            const decoOffsetY = avatarY - (scaledDecoSize - avatarSize) / 2;
            ctx.drawImage(decoImage, decoOffsetX, decoOffsetY, scaledDecoSize, scaledDecoSize);
        }
    }

    // --- 6. Server Name (WITH DARK BACKGROUND BOX) ---
    ctx.save();
    const serverName = "A2-Q Server";
    ctx.font = 'bold 60px "Noto Sans", "ReemKufi Bold", "Symbol", "Apple Symbols", "Apple Color Emoji"';
    
    // Calculate Box Size
    const nameMetrics = ctx.measureText(serverName);
    const namePadding = 20; // Space around text
    const nameHeight = 60; // Approx font height
    
    // Coordinates
    const nameX = dim.width - 70; 
    const nameY = dim.height - 70;

    // Draw Dark Background Box
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Dark transparent
    const boxWidth = nameMetrics.width + (namePadding * 2);
    const boxHeight = nameHeight + namePadding;
    
    // Draw rect (Offset x by width to align right, offset y by height to align bottom)
    ctx.fillRect(
        nameX - nameMetrics.width - namePadding, 
        nameY - nameHeight - (namePadding / 2), 
        boxWidth, 
        boxHeight
    );

    // Draw Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(serverName, nameX, nameY);
    ctx.restore();

    // --- 7. User Text ---
    const textX = avatarX + avatarSize + 70;
    let currentY = dim.height / 2 - 15;

    ctx.fillStyle = '#ffffff';
    // Increased shadow slightly since background is lighter now
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)"; 
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    const cleanedDisplayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim();
    const displayName = cleanedDisplayName || user.username;

    ctx.font = 'bold 120px "gg sans Bold", "Geeza Bold", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(displayName, textX, currentY);

    // Reset shadow
    ctx.shadowColor = "transparent";

    // Username
    currentY += 115;
    const cleanedUsername = user.username.replace(/<a?:\w+:\d+>/g, '').trim();
    let usernameText;

    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;

    if (user.discriminator && user.discriminator !== '0') {
        usernameText = `${cleanedUsername}#${user.discriminator}`;
    } else {
        usernameText = `@${cleanedUsername}`;
    }

    ctx.font = '100px "SF Pro Text Regular", sans-serif';
    ctx.fillStyle = '#e1e1e1'; // Slightly brighter grey for readability
    ctx.fillText(usernameText, textX, currentY);

    ctx.restore();
    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };
