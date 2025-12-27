const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    MessageFlags,
    ActionRowBuilder, // <--- Added
    ButtonBuilder,    // <--- Added
    ButtonStyle       // <--- Added
} = require('discord.js');

const Warn = require('../../../src/models/Warn');
const moment = require('moment-timezone'); // <--- Required for GMT+7 time

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Manage user warnings.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        // 1. ADD
        .addSubcommand(subcommand =>
            subcommand
                .setName('\u200c')
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

            // 1. Save to Database
            const newWarn = new Warn({
                guildId: interaction.guild.id,
                userId: target.id,
                moderatorId: interaction.user.id,
                reason: reason
            });

            await newWarn.save();

            // 2. Create the Embed
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('<:yes:1297814648417943565> User Warned')
                .setDescription(`**User:** ${target.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
                .setThumbnail(target.displayAvatarURL())

            // 3. Create the Timestamp Button (GMT+7)
            const thailandTime = moment().tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
            
            const timeButton = new ButtonBuilder()
                .setCustomId('warn_timestamp')
                .setLabel(`${thailandTime} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary) // Grey
                .setDisabled(true); // Unclickable

            const row = new ActionRowBuilder().addComponents(timeButton);

            // 4. Send Public Message with Button
            await interaction.reply({ 
                embeds: [embed], 
                components: [row] 
            });

            // 5. DM the user (Silent fail if closed)
            try {
                await target.send(`You have been warned in **${interaction.guild.name}** for: ${reason}`);
            } catch (err) { }

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
                    flags: MessageFlags.Ephemeral 
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
                flags: MessageFlags.Ephemeral 
            });

        // --- WARN REMOVE ---
        } else if (subcommand === 'remove') {
            const warnId = interaction.options.getString('warn_id');

            try {
                const deletedWarn = await Warn.findByIdAndDelete(warnId);

                if (deletedWarn) {
                    await interaction.reply({ 
                        content: `<:yes:1297814648417943565> Warning \`${warnId}\` has been removed.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                } else {
                    await interaction.reply({ 
                        content: `<:no:1297814819105144862> Could not find a warning with ID \`${warnId}\`. Check the ID and try again.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (err) {
                await interaction.reply({ 
                    content: `<:no:1297814819105144862> Invalid ID format. Please copy it exactly from \`/warn list\`.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    }
};
