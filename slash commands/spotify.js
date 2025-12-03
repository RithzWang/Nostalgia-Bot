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
        .setDescription('Show a beautiful card of what you are listening to.')
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
        
        const canvas = createCanvas(750, 320);
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

        // C. Text Configuration with FALLBACK FONTS
        // We list the fonts you registered: Main -> Thai (Kanit) -> Arabic (Naskh) -> Emoji
        ctx.fillStyle = '#FFFFFF';

        // 1. Title
        // Uses "SF Pro Bold" first. If it sees Thai, it switches to "Kanit", etc.
        ctx.font = 'bold 40px "SF Pro", "Thonburi", "SFArabic"'; 
        
        let displayTitle = trackTitle;
        if (displayTitle.length > 20) displayTitle = displayTitle.substring(0, 20) + "...";
        ctx.fillText(displayTitle, 250, 80);

        // 2. Artist
        ctx.fillStyle = '#B3B3B3'; 
        // Uses "SF Pro" (Semibold) as primary
        ctx.font = '30px "SF Pro SemiBold", "Thonburi", "SFArabic"';
        ctx.fillText(trackArtist, 250, 125);

        // 3. Album
        // We don't use italic here because your registered fonts might not support synthesizing italics well.
        // We rely on the lighter/different weight if available, or just standard SF Pro.
        ctx.font = '20px "SF Pro SemiBold", "Thonburi", "SFArabic"';
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
        // Using "SF Pro" or "Math" for numbers
        ctx.font = '14px "Math"';
        
        const formatTime = (ms) => {
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };

        ctx.fillText(formatTime(current), 250, 225); 
        ctx.fillText(formatTime(duration), 250 + barWidth - 30, 225); 

        // --- FINAL OUTPUT --- //
        
        const attachment = new AttachmentBuilder(await canvas.encode('png'), { name: 'spotify-card.png' });

        const embed = new EmbedBuilder()
            .setTitle(`${member.displayName}'s listening to`)
            .setColor('#1DB954')
            .setImage('attachment://spotify-card.png');

        // Calculate Date and Time for GMT+7
        const now = new Date();
        // Using 'en-GB' to get DD/MM/YYYY format
        const dateTimeString = now.toLocaleString('en-GB', { 
            timeZone: 'Asia/Bangkok', 
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false // 24-hour format (e.g., 20:30 instead of 8:30 pm)
        });

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spotify_timestamp') 
                    .setLabel(`${dateTimeString} (GMT+7)`) 
                    .setStyle(ButtonStyle.Secondary) 
                    .setDisabled(true)
            );

        await interaction.editReply({ 
            embeds: [embed], 
            files: [attachment],
            components: [row]
        });
    },
};
