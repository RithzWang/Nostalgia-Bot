const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    MessageFlags 
} = require('discord.js');
const moment = require('moment-timezone');
const { setTimeout } = require('node:timers/promises'); // Add this for the delay

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick members from the server')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        
        // --- SUBCOMMAND: USER ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('user')
                .setDescription('Kick a specific member from the server')
                .addUserOption(option => 
                    option.setName('target')
                    .setDescription('The member to kick')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                    .setDescription('Reason for the kick'))
        )

        // --- SUBCOMMAND: ROLE ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('role')
                .setDescription('Kick all members with a specific role (ignores boosters)')
                .addRoleOption(option =>
                    option.setName('target_role')
                    .setDescription('The role to kick members from')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('reason')
                    .setDescription('Reason for the mass kick'))
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        // --------------------------------------------------------
        //                      /KICK USER
        // --------------------------------------------------------
        if (subcommand === 'user') {
            const targetUser = interaction.options.getUser('target');
            const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

            // --- ERROR CHECKS ---
            if (!member) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Member is not in the server.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            if (targetUser.id === interaction.user.id) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> You cannot kick yourself.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            if (!member.kickable) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> I cannot kick this member (Check my role position).', 
                    flags: MessageFlags.Ephemeral 
                });
            }
            if (interaction.member.roles.highest.position <= member.roles.highest.position) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> You cannot kick someone with a higher or equal role.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // --- EXECUTE KICK ---
            try {
                await member.send(`You have been kicked from **${interaction.guild.name}**\n**Reason:** ${reason}`).catch(() => {});
                
                await member.kick(reason);

                // --- EMBED & BUTTON ---
                const embed = new EmbedBuilder()
                    .setColor(0xFFA500) // Orange
                    .setTitle('<:yes:1297814648417943565> Member Kicked Successfully')
                    .setDescription(`**Member:** ${targetUser.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
                    .setThumbnail(targetUser.displayAvatarURL());

                const thailandTime = moment().tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
                const timeButton = new ButtonBuilder()
                    .setCustomId('kick_timestamp_user')
                    .setLabel(`${thailandTime} (GMT+7)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const row = new ActionRowBuilder().addComponents(timeButton);

                await interaction.reply({ embeds: [embed], components: [row] });

            } catch (error) {
                console.error(error);
                await interaction.reply({ 
                    content: '<:no:1297814819105144862> An error occurred while kicking.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        // --------------------------------------------------------
        //                      /KICK ROLE
        // --------------------------------------------------------
        if (subcommand === 'role') {
            await interaction.deferReply(); 

            const targetRole = interaction.options.getRole('target_role');
            const allMembers = await interaction.guild.members.fetch();
            
            const membersToKick = allMembers.filter(m => 
                m.roles.cache.has(targetRole.id) && 
                !m.premiumSinceTimestamp && 
                m.id !== interaction.user.id && 
                m.kickable && 
                interaction.member.roles.highest.position > m.roles.highest.position 
            );

            if (membersToKick.size === 0) {
                return interaction.editReply({ 
                    content: '<:no:1297814819105144862> No eligible members found to kick. (Boosters and users with higher/equal roles are skipped).' 
                });
            }

            // Send an initial update so the user knows it's working
            await interaction.editReply({
                content: `⏳ Commencing mass kick of **${membersToKick.size}** members. This will take some time to prevent API rate limits...`
            });

            let kickedCount = 0;
            let failedCount = 0;

            for (const [id, m] of membersToKick) {
                try {
                    await m.send(`You have been kicked from **${interaction.guild.name}**\n**Reason:** Mass Role Kick - ${reason}`).catch(() => {});
                    await m.kick(`Mass Role Kick: ${reason}`);
                    kickedCount++;
                } catch (error) {
                    failedCount++;
                }
                
                // --- CRITICAL FIX: The Delay ---
                // Wait 1.5 seconds between each kick to respect Discord's rate limits
                await setTimeout(1500); 
            }

            // --- EMBED & BUTTON ---
            const embed = new EmbedBuilder()
                .setColor(0xFFA500) 
                .setTitle('<:yes:1297814648417943565> Mass Role Kick Completed')
                .setDescription(`**Target Role:** ${targetRole}\n**Successfully Kicked:** ${kickedCount}\n**Failed/Skipped:** ${failedCount}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`);

            const thailandTime = moment().tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
            const timeButton = new ButtonBuilder()
                .setCustomId('kick_timestamp_role')
                .setLabel(`${thailandTime} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(timeButton);

            // --- CRITICAL FIX: The 15 Minute Timeout Handling ---
            try {
                // If the loop finished in under 15 minutes, we can just edit the reply
                await interaction.editReply({ content: null, embeds: [embed], components: [row] });
            } catch (error) {
                // If it took longer than 15 mins, the interaction token expired. 
                // We fallback to just sending a regular message in the channel.
                await interaction.channel.send({ 
                    content: `<@${interaction.user.id}> The mass kick operation has finished.`, 
                    embeds: [embed], 
                    components: [row] 
                });
            }
        }
    }
};
