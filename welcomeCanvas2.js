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

    // Canvas setup with extra space at top
    const topOffset = 50;
    const canvas = createCanvas(dim.width, dim.height + topOffset);
    const ctx = canvas.getContext('2d');

    // =================================================================
    // LAYER 1: THE CARD CONTENT (Everything inside the rounded rectangle)
    // =================================================================
    ctx.save(); // Save untranslated state

    // shift everything down by 50px to make room at the top
    ctx.translate(0, topOffset);

    // --- Clip everything to the card shape ---
    const cornerRadius = 80;
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip();

    // --- Draw Background ---
    const bannerURL = user.bannerURL({ extension: 'png', size: 2048 });
    let backgroundBuf = null;
    if (bannerURL) backgroundBuf = await loadImage(bannerURL).catch(() => null);
    if (!backgroundBuf) backgroundBuf = await loadImage(member.displayAvatarURL({ extension: 'png', size: 2048 })).catch(() => null);

    if (backgroundBuf) {
        const canvasRatio = dim.width / dim.height;
        const sHeight = backgroundBuf.width / canvasRatio;
        if (backgroundBuf.height > sHeight) {
            ctx.drawImage(backgroundBuf, 0, (backgroundBuf.height - sHeight) / 2, backgroundBuf.width, sHeight, 0, 0, dim.width, dim.height);
        } else {
            ctx.drawImage(backgroundBuf, (backgroundBuf.width - (backgroundBuf.height * canvasRatio)) / 2, 0, backgroundBuf.height * canvasRatio, backgroundBuf.height, 0, 0, dim.width, dim.height);
        }
        ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)';
        ctx.drawImage(canvas, 0, topOffset); // Draw the clipped area back onto itself blurred
        ctx.filter = 'none';
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // --- Dark Overlay ---
    ctx.fillStyle = bannerURL ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // --- Inner Frame ---
    ctx.lineWidth = 40;
    const isNitro = (user.banner !== null) || (user.avatar && user.avatar.startsWith('a_'));
    if (user.hexAccentColor && isNitro) {
        const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
        gradient.addColorStop(0, user.hexAccentColor);
        gradient.addColorStop(1, shadeColor(user.hexAccentColor, isColorLight(user.hexAccentColor) ? -0.6 : 0.6));
        ctx.strokeStyle = gradient;
    } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    }
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.stroke();

    // --- Avatar Calculations ---
    const avatarSize = 400;
    const avatarX = dim.margin + 30;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;
    const mainAvatar = await loadImage(member.displayAvatarURL({ extension: 'png', size: 512 }));

    // Avatar Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetX = 8;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.fillStyle = '#000000';
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Reset shadow

    // Avatar Image
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.clip();
    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // Avatar Decoration
    const decoURL = user.avatarDecorationURL({ extension: 'png', size: 512 });
    if (decoURL) {
        const decoImage = await loadImage(decoURL).catch(() => null);
        if (decoImage) {
            const scaledDecoSize = avatarSize * 1.2;
            ctx.drawImage(decoImage, avatarX - (scaledDecoSize - avatarSize) / 2, avatarY - (scaledDecoSize - avatarSize) / 2, scaledDecoSize, scaledDecoSize);
        }
    }

    // --- Text Section ---
    ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Server Name
    ctx.font = 'bold 60px "Noto Sans", "ReemKufi Bold", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText("A2-Q Realm", dim.width - 70, dim.height - 70);

    // User Text
    const textX = avatarX + avatarSize + 70;
    let currentY = dim.height / 2 - 15;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = 'bold 120px "gg sans Bold", sans-serif';
    ctx.fillText(member.displayName.replace(/<a?:\w+:\d+>/g, '').trim() || user.username, textX, currentY);

    // Username/Tag
    currentY += 115;
    ctx.font = '100px "SF Pro Text Regular", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(user.discriminator && user.discriminator !== '0' ? `${user.username}#${user.discriminator}` : `@${user.username}`, textX, currentY);

    // End Card Layer (Undo clipping and translation)
    ctx.restore();


    // =================================================================
    // LAYER 2: THE BADGE (Drawn absolutely on top)
    // =================================================================
    const badgeImage = await loadImage('./new-icon.png').catch(() => null);
    if (badgeImage) {
        // Using 500x250 ratio scaled down to 200x100
        const badgeWidth = 200;
        const badgeHeight = 100;

        // Calculate absolute coordinates
        // X sits horizontally centered on the avatar's absolute position
        const badgeX = (dim.margin + 30 + (avatarSize / 2)) - (badgeWidth / 2);

        // Y is centered on the top edge of the card (which is at y = topOffset)
        const badgeY = topOffset - (badgeHeight / 2);

        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };
