const { createCanvas, loadImage } = require('@napi-rs/canvas');

async function createWelcomeImage(member) {
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

    // --- 1. Draw Blurred Avatar Background ---
    const backgroundAvatarURL = member.displayAvatarURL({ extension: 'png', size: 2048 });
    const backgroundAvatar = await loadImage(backgroundAvatarURL).catch(() => null);

    if (backgroundAvatar) {
        const canvasRatio = dim.width / dim.height;
        const sWidth = backgroundAvatar.width;
        const sHeight = sWidth / canvasRatio;
        const sx = 0;
        const sy = (backgroundAvatar.height - sHeight) / 2;

        ctx.drawImage(backgroundAvatar, sx, sy, sWidth, sHeight, 0, 0, dim.width, dim.height);
        
        // Apply blur
        ctx.filter = 'blur(10px)'; 
        ctx.drawImage(canvas, 0, 0); 
        ctx.filter = 'none';
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }

    // --- 2. Overlay ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // --- 2.5 Inner Frame ---
    ctx.save();
    ctx.lineWidth = 40; 
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'; 
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.stroke();
    ctx.restore();

    // --- 3. Main Avatar (Foreground) ---
    const avatarSize = 400;
    const avatarX = dim.margin + 30;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;

    const mainAvatarURL = member.displayAvatarURL({ extension: 'png', size: 512 });
    const mainAvatar = await loadImage(mainAvatarURL);

    // --- 3a. Draw Shadow Behind Avatar ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    
    // Shadow Settings (1.0 = Max Darkness)
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)'; 
    ctx.shadowBlur = 35;                     
    ctx.shadowOffsetX = 8;                   
    ctx.shadowOffsetY = 8;                   
    
    ctx.fillStyle = '#000000'; 
    ctx.fill(); 
    ctx.restore();

    // --- 3b. Draw User Avatar (Clipped) ---
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // --- 3c. Draw Avatar Decoration ---
    const decoURL = member.user.avatarDecorationURL({ extension: 'png', size: 512 });
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

    // --- 4. Server Name ---
    ctx.save(); 
    ctx.font = 'bold 60px "Noto Sans", "SFArabic", "Math", "Apple Color Emoji"';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; 
    ctx.textAlign = 'right'; 
    ctx.textBaseline = 'bottom'; 
    ctx.fillText("A2-Q Server", dim.width - 70, dim.height - 70);
    ctx.restore(); 

    // --- 5. User Text ---
    const textX = avatarX + avatarSize + 70;
    
    // CHANGED: -50 -> -15
    // This pushes the first line down so its baseline is just above the middle
    let currentY = dim.height / 2 - 15; 

    ctx.fillStyle = '#ffffff';

    // Shadow Settings for Display Name
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 15;                     
    ctx.shadowOffsetX = 5;                   
    ctx.shadowOffsetY = 5;                   

    const cleanedDisplayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim();
    const displayName = cleanedDisplayName || member.user.username;

    // MAIN TEXT
    ctx.font = 'bold 110px "gg sans Bold", "SFArabic", "Thonburi", "Math", "Apple Color Emoji", sans-serif';
    ctx.textAlign = 'left'; 
    
    ctx.fillText(displayName, textX, currentY);

    // Reset shadow
    ctx.shadowColor = "transparent";
    
    // --- USERNAME ---
    currentY += 110; // This gap is fine, the shift above fixes the alignment

    const cleanedUsername = member.user.username.replace(/<a?:\w+:\d+>/g, '').trim();
    let usernameText;

    // Shadow Settings for Username
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 15;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    if (member.user.discriminator && member.user.discriminator !== '0') {
        usernameText = `${cleanedUsername}#${member.user.discriminator}`;
    } else {
        usernameText = `@${cleanedUsername}`;
    }

    // USERNAME FONT
    ctx.font = '90px "SF Pro Semi", sans-serif';
    
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(usernameText, textX, currentY);
