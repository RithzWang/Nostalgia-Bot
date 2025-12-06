const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    MessageFlags // <--- 1. Imported MessageFlags
} = require('discord.js');

const Warn = require('../../../src/models/Warn');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Manage user warnings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        // 1. ADD
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
        // 2. LIST
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('See warnings for a user.')
                .addUserOption(option => 
                    option.setName('target')
                    .setDescription('The user to check')
                    .setRequired(true)))
        // 3. REMOVE
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a specific warning using its ID.')
                .addStringOption(option => 
                    option.setName('warn_id')
                    .setDescription('The ID of the warning (copy from /warn list)')
                    .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // --- WARN ADD ---
        if (subcommand === 'add') {
            const target = interaction.options.getUser('target');
            const reason = interaction.options.getString('reason');

            const newWarn = new Warn({
                guildId: interaction.guild.id,
                userId: target.id,
                moderatorId: interaction.user.id,
                reason: reason
            });

            await newWarn.save();

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('⚠️ User Warned')
                .setDescription(`**User:** ${target.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
                .setTimestamp();

            // We usually keep the actual Warning PUBLIC so people see it.
            // If you want this hidden too, add "flags: MessageFlags.Ephemeral" here.
            await interaction.reply({ embeds: [embed] });

            try {
                await target.send(`You have been warned in **${interaction.guild.name}** for: ${reason}`);
            } catch (err) {
                // Ignore DMs
            }

        // --- WARN LIST ---
        } else if (subcommand === 'list') {
            const target = interaction.options.getUser('target');

            const warnings = await Warn.find({ 
                guildId: interaction.guild.id, 
                userId: target.id 
            });

            if (!warnings.length) {
                return interaction.reply({ 
                    content: `${target.tag} has **0** warnings.`, 
                    flags: MessageFlags.Ephemeral // <--- Updated
                });
            }

            const warningList = warnings.slice(-10).map((w) => {
                return `**ID:** \`${w._id}\`\n└ **Reason:** ${w.reason} - <t:${Math.floor(w.timestamp / 1000)}:R>`;
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle(`Warnings for ${target.username}`)
                .setDescription(`**Total Warnings:** ${warnings.length}\n\n${warningList}`)
                .setFooter({ text: 'Copy the ID to use in /warn remove' });

            await interaction.reply({ 
                embeds: [embed],
                flags: MessageFlags.Ephemeral // <--- Updated
            });

        // --- WARN REMOVE ---
        } else if (subcommand === 'remove') {
            const warnId = interaction.options.getString('warn_id');

            try {
                const deletedWarn = await Warn.findByIdAndDelete(warnId);

                if (deletedWarn) {
                    await interaction.reply({ 
                        content: `✅ Warning \`${warnId}\` has been removed.`, 
                        flags: MessageFlags.Ephemeral // <--- Updated
                    });
                } else {
                    await interaction.reply({ 
                        content: `❌ Could not find a warning with ID \`${warnId}\`. Check the ID and try again.`, 
                        flags: MessageFlags.Ephemeral // <--- Updated
                    });
                }
            } catch (err) {
                await interaction.reply({ 
                    content: `❌ Invalid ID format. Please copy it exactly from \`/warn list\`.`, 
                    flags: MessageFlags.Ephemeral // <--- Updated
                });
            }
        }
    }
};
