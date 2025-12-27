const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    MessageFlags // <--- Added
} = require('discord.js');
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The member to kick')
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
                .setCustomId('kick_timestamp')
                .setLabel(`${thailandTime} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(timeButton);

            // Success message is public
            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '<:no:1297814819105144862> An error occurred while kicking.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};
