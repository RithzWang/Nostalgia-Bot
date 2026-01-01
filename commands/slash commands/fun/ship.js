const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
// ⚠️ Note the extra "../" to go back 3 folders to the root
const { createShipImage } = require('../../../funCanvas'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ship')
        .setDescription('Check love compatibility between two users')
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The person to ship with')
            .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();

        const user1 = interaction.user;
        const user2 = interaction.options.getUser('target');

        const percentage = Math.floor(Math.random() * 101);

        let comment;
        if (percentage < 20) comment = "Big Oof... 🧊";
        else if (percentage < 50) comment = "Maybe just friends? 🤝";
        else if (percentage < 80) comment = "There's a spark! ✨";
        else comment = "Match made in heaven! 💍";

        try {
            const buffer = await createShipImage(user1, user2, percentage);
            const attachment = new AttachmentBuilder(buffer, { name: 'ship.png' });

            const embed = new EmbedBuilder()
                .setTitle('❤️ Love Calculator')
                .setDescription(`**${user1.displayName}** + **${user2.displayName}** = **${percentage}%**\n\n${comment}`)
                .setImage('attachment://ship.png')
                .setColor(percentage > 50 ? 0xFF007F : 0x808080); 

            await interaction.editReply({ embeds: [embed], files: [attachment] });
        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '<:no:1297814819105144862> Failed to generate image.' });
        }
    },
};
