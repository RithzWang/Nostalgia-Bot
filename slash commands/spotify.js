const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spotify')
        .setDescription('Show a beautiful card of what you (or someone else) are listening to.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Check someone else\'s Spotify status')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        // 1. Get the target user (yourself or the person you mentioned)
        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);

        // 2. Find the Spotify Activity
        // We look through all activities to find one with name 'Spotify'
        const activity = member.presence?.activities.find(act => act.name === 'Spotify');

        if (!activity) {
            return interaction.editReply({ 
                content: `❌ **${user.username}** is not listening to Spotify right now (or their status is hidden).` 
            });
        }

        // 3. Extract Data
        const trackTitle = activity.details || "Unknown Title";
        const trackArtist = activity.state || "Unknown Artist";
        const trackAlbum = activity.assets.largeText || "Unknown Album";
        const albumArtURL = activity.assets.largeImageURL({ extension: 'png' });
        
        // Calculate Time / Progress Bar
        let start = 0, end = 0, duration = 0, current = 0, percent = 0;
        if (activity.timestamps) {
            start = activity.timestamps.start.getTime();
            end = activity.timestamps.end.getTime();
            duration = end - start;
            current = Date.now() - start;
            percent = current / duration;
        }

        // --- 4. DRAWING THE CANVAS --- //
        
        const canvas = createCanvas(750, 250);
        const ctx = canvas.getContext('2d');

        // A. Background (Dark Grey)
        ctx.fillStyle = '#181818'; // Spotify Dark Grey
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // B. Load and Draw Album Art
        // Note: Spotify images are sometimes squares, sometimes rectangles. We force a square.
        try {
            const albumImage = await loadImage(albumArtURL);
            ctx.drawImage(albumImage, 25, 25, 200, 200); // x, y, width, height
        } catch (e) {
            // Fallback if image fails to load
            ctx.fillStyle = '#333';
            ctx.fillRect(25, 25, 200, 200);
        }

        // C. Text Configuration
        ctx.fillStyle = '#FFFFFF';
        
        // Title (Truncate if too long)
        ctx.font = 'bold 40px "SF Pro Bold", "Noto Sans", "Naskh", "Kanit"'; 
        let displayTitle = trackTitle;
        if (displayTitle.length > 20) displayTitle = displayTitle.substring(0, 20) + "...";
        ctx.fillText(displayTitle, 250, 80);

        // Artist
        ctx.fillStyle = '#B3B3B3'; // Light Grey
        ctx.font = '30px "SF Pro Bold", "Noto Sans", "Naskh", "Kanit"';
        ctx.fillText(trackArtist, 250, 125);

        // Album (Smaller)
        ctx.font = 'italic 20px "SF Pro Bold", "Noto Sans", "Naskh", "Kanit"';
        let displayAlbum = trackAlbum;
        if (displayAlbum.length > 30) displayAlbum = displayAlbum.substring(0, 30) + "...";
        ctx.fillText(displayAlbum, 250, 160);

        // D. Progress Bar
        // Draw the empty bar
        const barX = 250;
        const barY = 200;
        const barWidth = 450;
        const barHeight = 8;

        ctx.fillStyle = '#404040'; // Darker grey for empty part
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
        ctx.fill();

        // Draw the filled bar (Spotify Green)
        const fillWidth = Math.max(0, Math.min(barWidth, barWidth * percent)); // Clamp between 0 and max width
        ctx.fillStyle = '#1DB954'; 
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillWidth, barHeight, 4);
        ctx.fill();

        // E. Timestamps (Optional text next to bar)
        ctx.fillStyle = '#B3B3B3';
        ctx.font = '14px "SF Pro"';
        
        const formatTime = (ms) => {
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };

        ctx.fillText(formatTime(current), 250, 225); // Current time
        ctx.fillText(formatTime(duration), 250 + barWidth - 30, 225); // Total time

        // 5. Send the image
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'spotify-card.png' });
        await interaction.editReply({ files: [attachment] });
    },
};
