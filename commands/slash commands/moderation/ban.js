const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to ban')
            .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
            .setDescription('Reason for the ban'))
        .addStringOption(option =>
            option.setName('delete_messages')
            .setDescription('Delete message history?')
            .addChoices(
                { name: 'Don\'t delete', value: '0' },
                { name: 'Previous 1 Hour', value: '3600' },
                { name: 'Previous 24 Hours', value: '86400' },
                { name: 'Previous 7 Days', value: '604800' }
            )),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const deleteSeconds = parseInt(interaction.options.getString('delete_messages') || '0');

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // --- ERROR CHECKS ---
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: '<:no:1297814819105144862> You cannot ban yourself.', ephemeral: true });
        }
        if (member) {
            if (!member.bannable) {
                return interaction.reply({ content: '<:no:1297814819105144862> I cannot ban this user (they may have a higher role).', ephemeral: true });
            }
            if (interaction.member.roles.highest.position <= member.roles.highest.position) {
                return interaction.reply({ content: '<:no:1297814819105144862> You cannot ban someone with a higher or equal role.', ephemeral: true });
            }
        }

        // --- EXECUTE BAN ---
        try {
            // Send DM before banning
            await targetUser.send(`You have been banned from **${interaction.guild.name}**\n**Reason:** ${reason}`).catch(() => {});

            await interaction.guild.members.ban(targetUser, { 
                reason: reason, 
                deleteMessageSeconds: deleteSeconds 
            });

            // --- EMBED & BUTTON ---
            const embed = new EmbedBuilder()
                .setColor(0xFF0000) // Red
                .setTitle('<:yes:1297814648417943565> User Banned')
                .setDescription(`**User:** ${targetUser.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
                .setThumbnail(targetUser.displayAvatarURL());

            const thailandTime = moment().tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
            const timeButton = new ButtonBuilder()
                .setCustomId('ban_timestamp')
                .setLabel(`${thailandTime} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(timeButton);

            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '<:no:1297814819105144862> There was an error trying to ban this user.', ephemeral: true });
        }
    }
};
