const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    MessageFlags 
} = require('discord.js');

const SuggestionConfig = require('../../../src/models/SuggestionConfig');
const Suggestion = require('../../../src/models/Suggestion');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggestion')
        .setDescription('Admin commands for suggestions')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        // 1. SETUP
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Set the channel for suggestions')
                .addChannelOption(opt => opt.setName('channel').setDescription('The channel').setRequired(true))
        )
        // 2. DECISION
        .addSubcommand(sub =>
            sub.setName('decision')
                .setDescription('Accept or Reject a suggestion')
                .addStringOption(opt => opt.setName('message_id').setDescription('The ID of the suggestion message').setRequired(true))
                .addStringOption(opt => opt.setName('status').setDescription('Decision').setRequired(true).addChoices(
                    { name: 'Accept', value: 'Accepted' },
                    { name: 'Reject', value: 'Rejected' }
                ))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for decision').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');

            // Save to DB
            await SuggestionConfig.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { guildId: interaction.guild.id, channelId: channel.id },
                { upsert: true, new: true }
            );

            return interaction.reply({ 
                content: `<:yes:1297814648417943565> Suggestion channel set to ${channel}.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        else if (sub === 'decision') {
            const msgId = interaction.options.getString('message_id');
            const status = interaction.options.getString('status');
            const reason = interaction.options.getString('reason');

            const suggestion = await Suggestion.findOne({ messageId: msgId });
            
            if (!suggestion) {
                return interaction.reply({ content: '<:no:1297814819105144862> Suggestion not found in database.', flags: MessageFlags.Ephemeral });
            }

            const config = await SuggestionConfig.findOne({ guildId: interaction.guild.id });
            if (!config) return interaction.reply({ content: '<:no:1297814819105144862> Setup not done.', flags: MessageFlags.Ephemeral });

            const channel = interaction.guild.channels.cache.get(config.channelId);
            if (!channel) return interaction.reply({ content: '<:no:1297814819105144862> Suggestion channel deleted.', flags: MessageFlags.Ephemeral });

            try {
                const message = await channel.messages.fetch(msgId);
                const oldEmbed = message.embeds[0];
                const oldComponents = message.components[0]; // Get current buttons

                // Determine Color and Title based on status
                let color = 0x808080;
                let statusText = "Pending";

                if (status === 'Accepted') {
                    color = 0x57F287; // Green
                    statusText = "Accepted";
                } else if (status === 'Rejected') {
                    color = 0xED4245; // Red
                    statusText = "Rejected";
                }

                const newEmbed = EmbedBuilder.from(oldEmbed)
                    .setColor(color)
                    .spliceFields(0, 1) // Remove old Status field
                    .setFields([
                        { name: 'Status', value: `${statusText} - ${reason}`, inline: false },
                        { name: 'Author', value: `<@${suggestion.authorId}>`, inline: true }
                    ]);

                // --- DISABLE BUTTONS LOGIC ---
                let newRow = null;
                if (oldComponents) {
                    newRow = ActionRowBuilder.from(oldComponents);
                    const disabledButtons = newRow.components.map(btn => 
                        ButtonBuilder.from(btn).setDisabled(true)
                    );
                    newRow.setComponents(disabledButtons);
                }

                await message.edit({ 
                    embeds: [newEmbed], 
                    components: newRow ? [newRow] : [] // Update with disabled buttons
                }); 
                
                suggestion.status = status;
                await suggestion.save();

                return interaction.reply({ content: `<:yes:1297814648417943565> Suggestion marked as **${status}**.`, flags: MessageFlags.Ephemeral });

            } catch (err) {
                console.error(err);
                return interaction.reply({ content: '<:no:1297814819105144862> Message not found or error editing.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
