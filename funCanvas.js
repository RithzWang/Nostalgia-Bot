const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Use the same font stack as your welcome image to support Arabic/Thai/Emojis
const FONT_STACK = '"gg sans Bold", "SF Pro Semi", "SFArabic", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", sans-serif';

module.exports = {
    
    // ==========================================
    // 1. WANTED POSTER LOGIC
    // ==========================================
    createWantedImage: async (user, bounty) => {
        const width = 800;
        const height = 1130; 
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background (Paper color)
        ctx.fillStyle = '#E8DCC4';
        ctx.fillRect(0, 0, width, height);

        // Texture (Grain)
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#000000';
        for(let i=0; i<5000; i++) {
            ctx.fillRect(Math.random() * width, Math.random() * height, 2, 2);
        }
        ctx.globalAlpha = 1.0;

        // Border
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#3E2723';
        ctx.strokeRect(40, 40, width - 80, height - 80);

        // Text: "WANTED"
        ctx.fillStyle = '#3E2723';
        ctx.textAlign = 'center';
        ctx.font = `bold 130px "Times New Roman", ${FONT_STACK}`; 
        ctx.fillText('WANTED', width / 2, 180);

        ctx.font = `bold 50px ${FONT_STACK}`;
        ctx.fillText('DEAD OR ALIVE', width / 2, 240);

        // Avatar
        const avatarSize = 500;
        const avatarX = (width / 2) - (avatarSize / 2);
        const avatarY = 280;

        ctx.fillStyle = '#222';
        ctx.fillRect(avatarX - 10, avatarY - 10, avatarSize + 20, avatarSize + 20);

        try {
            const avatar = await loadImage(user.displayAvatarURL({ extension: 'png', size: 1024 }));
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        } catch (e) { console.error(e); }

        // User Name
        let nameFontSize = 80;
        ctx.font = `bold ${nameFontSize}px ${FONT_STACK}`;
        const name = user.displayName.toUpperCase();
        while (ctx.measureText(name).width > width - 100) {
            nameFontSize -= 5;
            ctx.font = `bold ${nameFontSize}px ${FONT_STACK}`;
        }
        ctx.fillText(name, width / 2, 880);

        // Bounty
        ctx.font = `bold 100px ${FONT_STACK}`;
        ctx.fillStyle = '#8B0000';
        ctx.fillText(`$${bounty.toLocaleString()}`, width / 2, 1030);

        return canvas.toBuffer('image/png');
    },

    // ==========================================
    // 2. SHIP (LOVE) LOGIC
    // ==========================================
    createShipImage: async (user1, user2, percentage) => {
        const width = 900;
        const height = 400;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background Gradient
        const grd = ctx.createLinearGradient(0, 0, width, 0);
        grd.addColorStop(0, '#ff9a9e');
        grd.addColorStop(1, '#fecfef');
        ctx.fillStyle = grd;
        ctx.fillRect(0, 0, width, height);

        const avatarSize = 250;
        
        const drawAvatar = async (u, x, y) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + avatarSize/2, y + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            try {
                const img = await loadImage(u.displayAvatarURL({ extension: 'png', size: 512 }));
                ctx.drawImage(img, x, y, avatarSize, avatarSize);
            } catch(e) {}
            ctx.restore();
            
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.arc(x + avatarSize/2, y + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            ctx.stroke();
        };

        await drawAvatar(user1, 50, 75);
        await drawAvatar(user2, 600, 75);

        // Heart
        ctx.fillStyle = '#ff0000';
        ctx.textAlign = 'center';
        ctx.font = `150px "Apple Color Emoji", sans-serif`; 
        ctx.fillText('❤️', width / 2, 260);

        // Percentage
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.font = `bold 60px ${FONT_STACK}`;
        const text = `${percentage}%`;
        ctx.strokeText(text, width / 2, 120);
        ctx.fillText(text, width / 2, 120);

        // Bar
        const barWidth = 600;
        const barHeight = 40;
        const barX = (width - barWidth) / 2;
        const barY = 340;

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        ctx.fillStyle = '#ff0055';
        ctx.fillRect(barX, barY, barWidth * (percentage / 100), barHeight);

        return canvas.toBuffer('image/png');
    },

    // ==========================================
    // 3. FAKE TWEET LOGIC
    // ==========================================
    createTweetImage: async (user, text) => {
        const width = 1000;
        let height = 500; 
        const canvas = createCanvas(width, height);
        // We initialize ctx here, but might replace it if we resize
        let ctx = canvas.getContext('2d');

        // Helper to wrap text
        const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
            let words = text.split(' ');
            let line = '';
            let currentY = y;

            for(let n = 0; n < words.length; n++) {
              let testLine = line + words[n] + ' ';
              let metrics = context.measureText(testLine);
              let testWidth = metrics.width;
              if (testWidth > maxWidth && n > 0) {
                context.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
              }
              else {
                line = testLine;
              }
            }
            context.fillText(line, x, currentY);
            return currentY;
        };

        // Standard Drawing Setup
        const setupCanvas = (context, w, h) => {
            context.fillStyle = '#15202b'; // Dark BG
            context.fillRect(0, 0, w, h);
        };

        setupCanvas(ctx, width, height);

        // --- Avatar & Names ---
        const avatarSize = 120;
        const marginX = 50;
        const marginY = 50;

        // Draw Avatar
        const drawAvatar = async (context) => {
            context.save();
            context.beginPath();
            context.arc(marginX + avatarSize/2, marginY + avatarSize/2, avatarSize/2, 0, Math.PI * 2);
            context.closePath();
            context.clip();
            try {
                const img = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
                context.drawImage(img, marginX, marginY, avatarSize, avatarSize);
            } catch(e) {}
            context.restore();
        };

        await drawAvatar(ctx);

        // Header Text
        const drawHeader = (context) => {
            context.fillStyle = '#ffffff';
            context.font = `bold 55px ${FONT_STACK}`;
            context.fillText(user.displayName, marginX + avatarSize + 30, marginY + 60);

            context.fillStyle = '#8899a6';
            context.font = `45px ${FONT_STACK}`;
            const handle = `@${user.username.replace(/\s+/g, '').toLowerCase()}`;
            context.fillText(handle, marginX + avatarSize + 30, marginY + 115);

            // Twitter Logo
            context.fillStyle = '#1DA1F2';
            context.font = `70px "Apple Color Emoji"`; 
            context.fillText('🐦', width - 120, 100);
        };
        
        drawHeader(ctx);

        // --- Measure Text Height ---
        ctx.font = `60px ${FONT_STACK}`;
        const textStartY = marginY + avatarSize + 80;
        const lineHeight = 75;
        const maxWidth = width - (marginX * 2);
        
        // Calculate required lines
        // A rough estimate is okay, but wrapping logic is safer. 
        // We'll just run wrapText invisibly first? Or calculate height manually.
        // Let's stick to the previous dynamic resize approach:

        // Basic line count estimate:
        const words = text.split(' ');
        let tempLine = '';
        let lineCount = 1;
        for (let n=0; n<words.length; n++) {
            let testLine = tempLine + words[n] + ' ';
            if (ctx.measureText(testLine).width > maxWidth && n > 0) {
                tempLine = words[n] + ' ';
                lineCount++;
            } else {
                tempLine = testLine;
            }
        }
        
        const requiredHeight = textStartY + (lineCount * lineHeight) + 150; // + footer

        let finalCtx = ctx;
        let finalCanvas = canvas;

        // If content is too tall, Resize!
        if (requiredHeight > height) {
            finalCanvas = createCanvas(width, requiredHeight);
            finalCtx = finalCanvas.getContext('2d');
            
            // Re-draw background and header on new canvas
            setupCanvas(finalCtx, width, requiredHeight);
            await drawAvatar(finalCtx);
            drawHeader(finalCtx);
        }

        // --- Draw Tweet Body ---
        finalCtx.fillStyle = '#ffffff';
        finalCtx.font = `60px ${FONT_STACK}`;
        const finalY = wrapText(finalCtx, text, marginX, textStartY, maxWidth, lineHeight);

        // --- Draw Footer ---
        finalCtx.fillStyle = '#8899a6';
        finalCtx.font = `40px ${FONT_STACK}`;
        finalCtx.fillText("10:24 AM · Twitter for Discord · 42K Retweets · 128K Likes", marginX, finalY + 100);

        return finalCanvas.toBuffer('image/png');
    }
};
