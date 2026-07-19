const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setserveravatar')
        .setDescription('Changes my profile picture for this specific server.')
        .addStringOption(option => 
            option.setName('url')
                .setDescription('The link to the image you want to use.')
                .setRequired(true)
        )
        // Ensures only server managers/admins can use this command
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // Deferring the reply is important here because fetching and uploading the image might take a few seconds
        await interaction.deferReply({ ephemeral: true });

        const imageUrl = interaction.options.getString('url');

        try {
            // Apply the new avatar specifically for this guild
            await interaction.guild.members.me.edit({ 
                avatar: imageUrl 
            });

            await interaction.editReply('Successfully updated my server profile picture! 🖼️');
        } catch (error) {
            console.error('Avatar update error:', error);
            
            // If it fails, it is usually due to an invalid URL or hitting Discord's strict avatar rate limits
            await interaction.editReply('There was an error updating the avatar. Make sure the URL is a direct image link and that I have not been changing avatars too quickly recently.');
        }
    },
};
