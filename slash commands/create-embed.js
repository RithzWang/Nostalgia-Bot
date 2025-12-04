const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-embed')
        .setDescription('Send a custom embed message.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addStringOption(option => 
            option.setName('title')
                .setDescription('The title of the embed')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('The main text of the embed')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Where to send this embed? (Optional)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false))
        .addStringOption(option => 
            option.setName('color')
                .setDescription('Hex color code (Default: #888888)')
                .setRequired(false)),

    async execute(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        
        // UPDATED: Default color is #888888
        const color = interaction.options.getString('color') || '#888888'; 

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description.replace(/\\n/g, '\n'))
            .setColor(color)


        try {
            await channel.send({ embeds: [embed] });
            
            await interaction.reply({ 
                content: `✅ Embed sent to ${channel} with color \`${color}\``, 
                ephemeral: true 
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `❌ I couldn't send the message. Check my permissions in that channel.`, 
                ephemeral: true 
            });
        }
    },
};
