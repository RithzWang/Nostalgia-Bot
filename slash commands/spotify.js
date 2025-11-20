const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
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
                content: `❌ **${member.displayName}** is not listening to Spotify right now (or their status is hidden).` 
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

        // --- DRAWING THE CANVAS --- //
        
        const canvas = createCanvas(750, 250);
        const ctx = canvas.getContext('2d');

        // A. Background (Vertical Grey Gradient)
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#595959'); 
        gradient.addColorStop(1, '#181818'); 
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

        // C. Text Configuration (Arabic Support)
        ctx.fillStyle = '#FFFFFF';
        
        const getFont = (text, baseFont) => {
            const arabicRegex = /[\u0600-\u06FF]/;
            if (arabicRegex.test(text)) return 'Naskh'; 
            return baseFont; 
        };

        // 1. Title
        const titleFont = getFont(trackTitle, 'SF Pro Bold'); 
        ctx.font = `bold 40px "${titleFont}"`; 
        let displayTitle = trackTitle;
        if (displayTitle.length > 20) displayTitle = displayTitle.substring(0, 20) + "...";
        ctx.fillText(displayTitle, 250, 80);

        // 2. Artist
        ctx.fillStyle = '#B3B3B3'; 
        const artistFont = getFont(trackArtist, 'Noto Sans');
        ctx.font = `30px "${artistFont}"`;
        ctx.fillText(trackArtist, 250, 125);

        // 3. Album
        ctx.font = 'italic 20px "Noto Sans"';
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
        ctx.font = '14px "Noto Sans"';
        
        const formatTime = (ms) => {
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };

        ctx.fillText(formatTime(current), 250, 225); 
        ctx.fillText(formatTime(duration), 250 + barWidth - 30, 225); 

        // --- FINAL OUTPUT (EMBED & BUTTON) --- //
        
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'spotify-card.png' });

        const embed = new EmbedBuilder()
            .setTitle(`${member.displayName}'s listening to`)
            .setColor('#1DB954') // Spotify Green
            .setImage('attachment://spotify-card.png');
            // Removed .setTimestamp() as requested

        // Calculate GMT+7 Time
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-GB', { 
            timeZone: 'Asia/Bangkok', // Use standard IANA time zone for GMT+7
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spotify_timestamp') 
                    .setLabel(`${timeString} GMT+7`) // Label with GMT+7 time
                    .setStyle(ButtonStyle.Secondary) // Grey style
                    .setDisabled(true)
            );

        await interaction.editReply({ 
            embeds: [embed], 
            files: [attachment],
            components: [row]
        });
    },
};
