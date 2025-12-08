const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createWelcomeImage(member) {
    // 1. IMPORTANT: Fetch the full user to get Banner and Accent Color
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

    // --- 2. Draw Background (Banner OR Avatar) ---
    // Try to get the profile banner first
    const bannerURL = user.bannerURL({ extension: 'png', size: 2048 });
    let backgroundBuf = null;

    if (bannerURL) {
        backgroundBuf = await loadImage(bannerURL).catch(() => null);
    }
    
    // Fallback: If no banner, use the avatar (original logic)
    if (!backgroundBuf) {
        const avatarURL = member.displayAvatarURL({ extension: 'png', size: 2048 });
        backgroundBuf = await loadImage(avatarURL).catch(() => null);
    }

    if (backgroundBuf) {
        const canvasRatio = dim.width / dim.height;
        const sWidth = backgroundBuf.width;
        const sHeight = sWidth / canvasRatio;
        
        // Calculate standard "object-fit: cover" logic
        let drawWidth = dim.width;
        let drawHeight = dim.height;
        let dx = 0;
        let dy = 0;

        // If the image is "taller" than the canvas ratio
        if (backgroundBuf.height > sHeight) {
            // Crop height
            const sourceHeight = backgroundBuf.width / canvasRatio;
            const sy = (backgroundBuf.height - sourceHeight) / 2;
            ctx.drawImage(backgroundBuf, 0, sy, backgroundBuf.width, sourceHeight, 0, 0, dim.width, dim.height);
        } else {
            // Crop width (rare for banners, common for avatars)
            const sourceWidth = backgroundBuf.height * canvasRatio;
            const sx = (backgroundBuf.width - sourceWidth) / 2;
            ctx.drawImage(backgroundBuf, sx, 0, sourceWidth, backgroundBuf.height, 0, 0, dim.width, dim.height);
        }
        
        // Apply blur (Heavier blur if it's an avatar, lighter if it's a banner to see details)
        ctx.filter = bannerURL ? 'blur(3px)' : 'blur(10px)'; 
        ctx.drawImage(canvas, 0, 0); 
        ctx.filter = 'none';
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // --- 3. Overlay ---
    // Darker overlay if it's a banner to ensure text readability
    ctx.fillStyle = bannerURL ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // --- 4. Inner Frame (Themed Gradient) ---
    ctx.save();
    ctx.lineWidth = 40; 

    // CHECK FOR ACCENT COLOR
    if (user.hexAccentColor) {
        // Create a gradient: Accent Color -> White (Top-Left to Bottom-Right)
        const gradient = ctx.createLinearGradient(0, 0, dim.width, dim.height);
        gradient.addColorStop(0, user.hexAccentColor); 
        gradient.addColorStop(1, '#ffffff'); // Fade to white for a metallic look
        // Or fade to transparent: gradient.addColorStop(1, 'rgba(255,255,255,0.2)');
        
        ctx.strokeStyle = gradient;
    } else {
        // Default logic if no accent color
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; 
    }

    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.stroke();
    ctx.restore();

    // --- 5. Main Avatar (Foreground) ---
    const avatarSize = 400;
    const avatarX = dim.margin + 30;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;

    const mainAvatarURL = member.displayAvatarURL({ extension: 'png', size: 512 });
    const mainAvatar = await loadImage(mainAvatarURL);

    // --- 5a. Draw Shadow Behind Avatar ---
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

    // --- 5b. Draw User Avatar (Clipped) ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // --- 5c. Draw Avatar Decoration ---
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

    // --- 6. Server Name ---
    ctx.save(); 
    ctx.font = 'bold 60px "Noto Sans", "ReemKufi Bold", "Math", "Apple Color Emoji"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; 
    ctx.textAlign = 'right'; 
    ctx.textBaseline = 'bottom'; 
    ctx.fillText("A2-Q Server", dim.width - 70, dim.height - 70);
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

    // MAIN TEXT
    ctx.font = 'bold 120px "gg sans Bold", "Geeza Bold", "Thonburi", "Math", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'left'; 
    
    ctx.fillText(displayName, textX, currentY);

    // Reset shadow
    ctx.shadowColor = "transparent";
    
    // --- USERNAME ---
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

    ctx.font = '90px "SF Pro Semi", sans-serif';
    
    // You can also match the username color to the accent color if you want!
    // For now, keeping it grey-ish white.
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(usernameText, textX, currentY);

    ctx.restore();
    return canvas.toBuffer('image/png');
}

module.exports = { createWelcomeImage };
