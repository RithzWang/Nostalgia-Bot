const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
// ⚠️ Adjust path if needed based on folder structure
const { createTweetImage } = require('../../../funCanvas'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tweet')
        .setDescription('Generate a fake tweet screenshot')
        .addStringOption(option => 
            option.setName('content')
            .setDescription('What to tweet?')
            .setRequired(true)
            .setMaxLength(280) // Twitter character limit
        )
        .addUserOption(option => 
            option.setName('user')
            .setDescription('Tweet as someone else? (Optional)')
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const text = interaction.options.getString('content');
        const targetUser = interaction.options.getUser('user') || interaction.user;

        try {
            const buffer = await createTweetImage(targetUser, text);
            const attachment = new AttachmentBuilder(buffer, { name: 'tweet.png' });

            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '<:no:1297814819105144862> Failed to generate image. Text might be too complex.' });
        }
    },
};
