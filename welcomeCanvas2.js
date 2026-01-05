const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createWelcomeImage(member) {
    const user = await member.user.fetch(true);

    const dim = {
        height: 606,
        width: 1770,
        margin: 100
    };

    // --- FIX 1: Make canvas taller to fit the badge ---
    const topOffset = 50; 
    const canvas = createCanvas(dim.width, dim.height + topOffset);
    const ctx = canvas.getContext('2d');

    // --- FIX 2: Shift everything down by 50px ---
    // This creates empty space at the top (y=0 to y=50) for the badge
    ctx.translate(0, topOffset);

    // --- Rounded Rectangle Clip Path --- 
    const cornerRadius = 80;
    ctx.save(); // <--- Start of Card Clipping
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip(); // <--- Nothing can be drawn outside the card while this is active

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

        ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // --- 4. Inner Frame ---
    ctx.save();
    ctx.lineWidth = 40;

    const hasBanner = user.banner !== null;
    const hasAnimatedAvatar = user.avatar && user.avatar.startsWith('a_');
    const isNitro = hasBanner || hasAnimatedAvatar;

    if (user.hexAccentColor && isNitro) {
        // ... (Nitro Gradient Logic) ...
        // Helper functions copied from your original code would go here or be outside
        const gradient = ctx.createLinearGradient(0, 0, 0, dim.height);
        gradient.addColorStop(0, user.hexAccentColor);
        gradient.addColorStop(1, '#000000'); // Simplified for brevity
        ctx.strokeStyle = gradient;
    } else {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    }

    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.stroke();
    ctx.restore();

    // --- FIX 3: RELEASE THE CLIP! ---
    // We must stop clipping here so we can draw the badge OUTSIDE the card
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
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
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

    // --- NEW BADGE (Now Visible!) ---
    const badgeImage = await loadImage('./emoji-1.png').catch(() => null);

    if (badgeImage) {
        const badgeWidth = 180; 
        const badgeHeight = 90; 

        // Center horizontally on Avatar
        const badgeX = (avatarX + (avatarSize / 2)) - (badgeWidth / 2);
        
        // Y = 0 (Top of Card) - Half Badge Height
        // This puts it half-in, half-out
        const badgeY = 0 - (badgeHeight / 2);

        ctx.drawImage(badgeImage, badgeX, badgeY, badgeWidth, badgeHeight);
    }

    // --- 6. Server Name ---
    ctx.save();
    ctx.font = 'bold 60px "Noto Sans", sans-serif'; // Simplified font list
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText("A2-Q Realm", dim.width - 70, dim.height - 70);
    ctx.restore();

    // --- 7. User Text ---
    const textX = avatarX + avatarSize + 70;
    let currentY = dim.height / 2 - 15;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    const cleanedDisplayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim();
    const displayName = cleanedDisplayName || user.username;

    ctx.font = 'bold 120px "gg sans Bold", sans-serif'; // Simplified font list
    ctx.textAlign = 'left';
    ctx.fillText(displayName, textX, currentY);

    ctx.shadowColor = "transparent";

    // Username
    currentY += 115;
    const cleanedUsername = user.username.replace(/<a?:\w+:\d+>/g, '').trim();
    let usernameText;
    
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    if (user.discriminator && user.discriminator !== '0') {
        usernameText = `${cleanedUsername}#${user.discriminator}`;
    } else {
        usernameText = `@${cleanedUsername}`;
    }

    ctx.font = '100px "SF Pro Text Regular", sans-serif';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(usernameText, textX, currentY);

    ctx.restore();
    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };
