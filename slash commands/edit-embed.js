const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('edit-embed')
        .setDescription('Edit an existing embed sent by this bot.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the message is')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true))
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('Right click the message -> Copy Message ID')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('new_title')
                .setDescription('New title (leave empty to keep current)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('new_description')
                .setDescription('New description (leave empty to keep current)')
                .setRequired(false))
        .addStringOption(option => 
            option.setName('new_color')
                .setDescription('New hex color (e.g. #888888)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const channel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');
        const newTitle = interaction.options.getString('new_title');
        const newDesc = interaction.options.getString('new_description');
        const newColor = interaction.options.getString('new_color');

        try {
            const message = await channel.messages.fetch(messageId);

            if (message.author.id !== interaction.client.user.id) {
                return interaction.editReply("❌ I can only edit messages that **I** sent.");
            }

            if (message.embeds.length === 0) {
                return interaction.editReply("❌ That message doesn't have an embed to edit.");
            }

            const oldEmbed = message.embeds[0];
            
            // Create new embed using existing data as base
            const editedEmbed = new EmbedBuilder(oldEmbed.toJSON());

            if (newTitle) editedEmbed.setTitle(newTitle);
            if (newDesc) editedEmbed.setDescription(newDesc.replace(/\\n/g, '\n'));
            if (newColor) editedEmbed.setColor(newColor);

            await message.edit({ embeds: [editedEmbed] });
            await interaction.editReply(`✅ Successfully edited message inside ${channel}`);

        } catch (error) {
            console.error(error);
            if (error.code === 10008) {
                return interaction.editReply("❌ Message not found. Check the ID and Channel.");
            }
            return interaction.editReply("❌ Something went wrong while editing.");
        }
    },
};
