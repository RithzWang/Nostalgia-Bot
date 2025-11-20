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

        const user = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(user.id);

        const activity = member.presence?.activities.find(act => act.name === 'Spotify');

        if (!activity) {
            return interaction.editReply({ 
                content: `❌ **${user.username}** is not listening to Spotify right now (or their status is hidden).` 
            });
        }

        const trackTitle = activity.details || "Unknown Title";
        const trackArtist = activity.state || "Unknown Artist";
        const trackAlbum = activity.assets.largeText || "Unknown Album";
        const albumArtURL = activity.assets.largeImageURL({ extension: 'png' });
        
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

        // A. Background (Dark Grey Gradient - LIKE YOUR EXAMPLE IMAGE)
        // createLinearGradient(x0, y0, x1, y1)
        // This creates a gradient from the top-left (0,0) to the bottom-right (canvas.width, canvas.height)
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#5A5A5A'); // Lighter grey at the top
        gradient.addColorStop(1, '#282828'); // Darker grey at the bottom
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);


        // B. Load and Draw Album Art
        try {
            const albumImage = await loadImage(albumArtURL);
            ctx.drawImage(albumImage, 25, 25, 200, 200); 
        } catch (e) {
            ctx.fillStyle = '#333';
            ctx.fillRect(25, 25, 200, 200);
        }

        // C. Text Configuration
        ctx.fillStyle = '#FFFFFF';
        
        // Title (Truncate if too long)
        ctx.font = 'bold 40px "SF Pro Bold"'; 
        let displayTitle = trackTitle;
        if (displayTitle.length > 20) displayTitle = displayTitle.substring(0, 20) + "...";
        ctx.fillText(displayTitle, 250, 80);

        // Artist
        ctx.fillStyle = '#B3B3B3'; 
        ctx.font = '30px "SF Pro"';
        ctx.fillText(trackArtist, 250, 125);

        // Album (Smaller)
        ctx.font = 'italic 20px "SF Pro"';
        let displayAlbum = trackAlbum;
        if (displayAlbum.length > 30) displayAlbum = displayAlbum.substring(0, 30) + "...";
        ctx.fillText(displayAlbum, 250, 160);

        // D. Progress Bar
        const barX = 250;
        const barY = 200;
        const barWidth = 450;
        const barHeight = 8;

        ctx.fillStyle = '#404040'; 
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 4);
        ctx.fill();

        const fillWidth = Math.max(0, Math.min(barWidth, barWidth * percent)); 
        ctx.fillStyle = '#1DB954'; 
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillWidth, barHeight, 4);
        ctx.fill();

        // E. Timestamps
        ctx.fillStyle = '#B3B3B3';
        ctx.font = '14px "SF Pro"';
        
        const formatTime = (ms) => {
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };

        ctx.fillText(formatTime(current), 250, 225); 
        ctx.fillText(formatTime(duration), 250 + barWidth - 30, 225); 

        // 5. Send the image
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'spotify-card.png' });
        await interaction.editReply({ files: [attachment] });
    },
};
