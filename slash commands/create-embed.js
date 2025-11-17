const { EmbedBuilder, ChannelType } = require('discord.js');
const config = require('../config.json'); // Path remains the same: one level up

module.exports = {
    name: 'createembed', 
    
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const color = interaction.options.getString('color') || config.colourEmbed; 
        const footerText = interaction.options.getString('footer');
        const imageURL = interaction.options.getString('image');
        const thumbnailURL = interaction.options.getString('thumbnail');
        
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
             return interaction.editReply({ content: '❌ The target channel must be a text channel.', ephemeral: true });
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color);

        if (footerText) {
            embed.setFooter({ text: footerText });
        }
        if (imageURL) {
            embed.setImage(imageURL);
        }
        if (thumbnailURL) {
            embed.setThumbnail(thumbnailURL);
        }

        try {
            await targetChannel.send({ embeds: [embed] });
            
            await interaction.editReply({ content: `✅ Successfully sent the embed to ${targetChannel}!`, ephemeral: true });

        } catch (error) {
            console.error('Error sending embed:', error);
            await interaction.editReply({ content: `❌ Failed to send embed to ${targetChannel}. Check bot permissions. Error: ${error.message}`, ephemeral: true });
        }
    }
};