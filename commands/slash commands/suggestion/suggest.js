const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} = require('discord.js');

const SuggestionConfig = require('../../../src/models/SuggestionConfig');
const Suggestion = require('../../../src/models/Suggestion');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion')
        .addStringOption(opt => opt.setName('idea').setDescription('Your suggestion').setRequired(true)),

    async execute(interaction) {
        const idea = interaction.options.getString('idea');

        // 1. Check Config
        const config = await SuggestionConfig.findOne({ guildId: interaction.guild.id });
        if (!config) {
            return interaction.reply({ 
                content: '<:no:1297814819105144862> Suggestions are not set up yet.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // 2. Check Channel (Must be used IN the specific channel)
        if (interaction.channelId !== config.channelId) {
            return interaction.reply({ 
                content: `<:no:1297814819105144862> Please use this command in <#${config.channelId}>.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // 3. Create Embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
            .setTitle('New Suggestion')
            .setDescription(idea)
            .setColor(0x808080) // Grey
            .addFields(
                { name: 'Status', value: 'Pending', inline: false }
            )
            .setTimestamp();

        // 4. Create Buttons
        const upvoteBtn = new ButtonBuilder()
            .setCustomId('suggestion_upvote')
            .setLabel('0')
            .setEmoji('👍')
            .setStyle(ButtonStyle.Success);

        const downvoteBtn = new ButtonBuilder()
            .setCustomId('suggestion_downvote')
            .setLabel('0')
            .setEmoji('👎')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(upvoteBtn, downvoteBtn);

        // 5. Send & Save
        const msg = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

        const newSuggestion = new Suggestion({
            guildId: interaction.guild.id,
            messageId: msg.id,
            authorId: interaction.user.id,
            content: idea
        });

        await newSuggestion.save();
    }
};
