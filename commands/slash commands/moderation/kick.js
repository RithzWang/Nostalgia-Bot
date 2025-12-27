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
        .setName('kick')
        .setDescription('Kick a user from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to kick')
            .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
            .setDescription('Reason for the kick')),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided';
        
        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // --- ERROR CHECKS ---
        if (!member) {
            return interaction.reply({ content: '<:no:1297814819105144862> User is not in the server.', ephemeral: true });
        }
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: '<:no:1297814819105144862> You cannot kick yourself.', ephemeral: true });
        }
        if (!member.kickable) {
            return interaction.reply({ content: '<:no:1297814819105144862> I cannot kick this user (Check my role position).', ephemeral: true });
        }
        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({ content: '<:no:1297814819105144862> You cannot kick someone with a higher or equal role.', ephemeral: true });
        }

        // --- EXECUTE KICK ---
        try {
            await member.send(`You have been kicked from **${interaction.guild.name}**\n**Reason:** ${reason}`).catch(() => {});
            
            await member.kick(reason);

            // --- EMBED & BUTTON ---
            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Orange
                .setTitle('<:yes:1297814648417943565> User Kicked')
                .setDescription(`**User:** ${targetUser.tag}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
                .setThumbnail(targetUser.displayAvatarURL());

            const thailandTime = moment().tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
            const timeButton = new ButtonBuilder()
                .setCustomId('kick_timestamp')
                .setLabel(`${thailandTime} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(timeButton);

            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '<:no:1297814819105144862> An error occurred while kicking.', ephemeral: true });
        }
    }
};
