const { createCanvas, loadImage } = require('canvas');

/**
 * Creates a custom welcome image for the new member.
 * @param {import('discord.js').GuildMember} member
 * @returns {Promise<Buffer>} The image buffer.
 */
async function createWelcomeImage(member) {
    const dim = {
        height: 200,
        width: 600,
        margin: 50
    };

    // 1. Canvas Setup
    const canvas = createCanvas(dim.width, dim.height);
    const ctx = canvas.getContext('2d');

    // 2. Background (Example: Dark Grey)
    ctx.fillStyle = '#36393f';
    ctx.fillRect(0, 0, dim.width, dim.height);

    // 3. Avatar
    const avatarSize = 128;
    const avatarX = dim.margin;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;

    // Fetch avatar image
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
    const avatar = await loadImage(avatarURL);

    // Create a circular clip path for the avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    // Draw the avatar
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore(); // Restore context to draw outside the clip

    // 4. Text - Position and Styling
    const textX = avatarX + avatarSize + dim.margin / 2;
    let currentY = dim.height / 2 - 20; // Starting point for display name

    ctx.fillStyle = '#ffffff';

    // Display Name (Large, Bold)
    const displayName = member.displayName; // Use displayName which can be the nickname
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(displayName, textX, currentY);

    // Username (Smaller, Subdued)
    currentY += 40; // Move down for the username
    const usernameText = `@${member.user.username}`;
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#b9bbbe'; // Discord light grey
    ctx.fillText(usernameText, textX, currentY);

    // Output
    return canvas.toBuffer('image/png');
}
