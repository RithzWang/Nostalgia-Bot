const { SlashCommandBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
// ⚠️ Note the extra "../" to go back 3 folders to the root
const { createWantedImage } = require('../../../funCanvas'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wanted')
        .setDescription('Generate a Wanted poster for a user')
        .addUserOption(option => 
            option.setName('user')
            .setDescription('Who is wanted?')
            .setRequired(false))
        .addIntegerOption(option => 
            option.setName('bounty')
            .setDescription('Set a specific bounty amount (Optional)')),

    async execute(interaction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user') || interaction.user;
        let bounty = interaction.options.getInteger('bounty');

        // If no bounty provided, generate a random one
        if (!bounty) {
            bounty = Math.floor(Math.random() * 900000) + 10000;
        }

        try {
            const buffer = await createWantedImage(target, bounty);
            const attachment = new AttachmentBuilder(buffer, { name: 'wanted.png' });

            await interaction.editReply({ files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '<:no:1297814819105144862> Failed to generate image.' });
        }
    },
};
