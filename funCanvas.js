const { createCanvas, loadImage } = require('@napi-rs/canvas');

// Use the same font stack as your welcome image to support Arabic/Thai/Emojis
const FONT_STACK = '"gg sans Bold", "Geeza Bold", "Thonburi", "Apple Gothic", "Hiragino Sans", "Pingfang", "Apple Color Emoji", "Symbol", "Apple Symbols", "Noto Symbol", "Noto Symbol 2", "Noto Math", "Noto Hieroglyphs", "Noto Music", sans-serif';

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
        ctx.fillText(`﷼${bounty.toLocaleString()}`, width / 2, 1030);

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
    }
};
