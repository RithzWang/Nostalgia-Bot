const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
// Path breakdown:
// ../ (up to 'slash commands')
// ../ (up to 'commands')
// ../ (up to 'src' or root)
// Then into 'models/Sticky'
const Sticky = require('../../../src/models/Sticky'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticky')
        .setDescription('Manage sticky messages.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a sticky message for this channel.')
                .addStringOption(option => 
                    option.setName('message')
                    .setDescription('The message to stick.')
                    .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Stop the sticky message in this channel.')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const content = interaction.options.getString('message');

            // Find config for this channel or create a new one
            let sticky = await Sticky.findOne({ channelId: interaction.channel.id });
            
            if (!sticky) {
                sticky = new Sticky({ channelId: interaction.channel.id, content: content });
            } else {
                sticky.content = content;
                sticky.lastMessageId = null; // Reset ID
            }

            await sticky.save();
            await interaction.reply({ content: '<:yes:1297814648417943565> Sticky message set!', flags: MessageFlags.Ephemeral });

        } else if (subcommand === 'remove') {
            const sticky = await Sticky.findOneAndDelete({ channelId: interaction.channel.id });

            if (sticky) {
                await interaction.reply({ content: '<:yes:1297814648417943565> Sticky message removed.', flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: '<:no:1297814819105144862> There is no sticky message in this channel.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
