const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const Warn = require('../../../src/models/Warn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Manage user warnings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        // Subcommand 1: Add a warning
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Warn a user.')
                .addUserOption(option => 
                    option.setName('target')
                    .setDescription('The user to warn')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                    .setDescription('The reason for the warning')
                    .setRequired(true)))
        // Subcommand 2: List warnings
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Check how many warnings a user has.')
                .addUserOption(option => 
                    option.setName('target')
                    .setDescription('The user to check')
                    .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const target = interaction.options.getUser('target');

        if (subcommand === 'add') {
            const reason = interaction.options.getString('reason');

            // 1. Save to Database
            const newWarn = new Warn({
                guildId: interaction.guild.id,
                userId: target.id,
                moderatorId: interaction.user.id,
                reason: reason
            });

            await newWarn.save();

            // 2. Reply to Chat
            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Red
                .setTitle('⚠️ User Warned')
                .setDescription(`**User:** ${target.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // 3. (Optional) Try to DM the user
            try {
                await target.send(`You have been warned in **${interaction.guild.name}** for: ${reason}`);
            } catch (err) {
                // Ignore if their DMs are closed
            }

        } else if (subcommand === 'list') {
            // 1. Fetch all warnings for this user in this server
            const warnings = await Warn.find({ 
                guildId: interaction.guild.id, 
                userId: target.id 
            });

            if (!warnings.length) {
                return interaction.reply({ content: `${target.tag} has **0** warnings.`, flags: MessageFlags.Ephemeral });
            }

            // 2. Format the list (Show last 10 to avoid too much text)
            const warningList = warnings.slice(-10).map((w, index) => {
                return `**${index + 1}.** ${w.reason} - <t:${Math.floor(w.timestamp / 1000)}:R>`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange
                .setTitle(`Warnings for ${target.username}`)
                .setDescription(`**Total Warnings:** ${warnings.length}\n\n${warningList}`)
                .setFooter({ text: 'Showing last 10 warnings' });

            await interaction.reply({ embeds: [embed] });
        }
    }
};
