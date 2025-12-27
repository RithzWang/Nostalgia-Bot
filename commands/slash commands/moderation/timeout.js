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
        .setName('timeout')
        .setDescription('Timeout (Mute) a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to timeout')
            .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
            .setDescription('How long?')
            .setRequired(true)
            .addChoices(
                { name: '60 Seconds', value: 60 * 1000 },
                { name: '5 Minutes', value: 5 * 60 * 1000 },
                { name: '10 Minutes', value: 10 * 60 * 1000 },
                { name: '1 Hour', value: 60 * 60 * 1000 },
                { name: '1 Day', value: 24 * 60 * 60 * 1000 },
                { name: '1 Week', value: 7 * 24 * 60 * 60 * 1000 },
            ))
        .addStringOption(option => 
            option.setName('reason')
            .setDescription('Reason for timeout')),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided';

        const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // --- ERROR CHECKS ---
        if (!member) {
            return interaction.reply({ content: '<:no:1297814819105144862> User is not in the server.', ephemeral: true });
        }
        if (!member.moderatable) {
            return interaction.reply({ content: '<:no:1297814819105144862> I cannot timeout this user (Higher role/Admin).', ephemeral: true });
        }
        if (interaction.member.roles.highest.position <= member.roles.highest.position) {
            return interaction.reply({ content: '<:no:1297814819105144862> You cannot timeout someone with a higher or equal role.', ephemeral: true });
        }

        // --- EXECUTE TIMEOUT ---
        try {
            await member.timeout(duration, reason);
            
            // Send DM
            await member.send(`You have been timed out in **${interaction.guild.name}**\n**Reason:** ${reason}`).catch(() => {});

            // Format duration for display
            const durationText = interaction.options.data.find(opt => opt.name === 'duration').value;
            // Since we only get the Milliseconds back, let's create a rough text
            let readableDuration = 'Duration';
            if(duration === 60000) readableDuration = '60 Seconds';
            if(duration === 300000) readableDuration = '5 Minutes';
            if(duration === 600000) readableDuration = '10 Minutes';
            if(duration === 3600000) readableDuration = '1 Hour';
            if(duration === 86400000) readableDuration = '1 Day';
            if(duration === 604800000) readableDuration = '1 Week';

            // --- EMBED & BUTTON ---
            const embed = new EmbedBuilder()
                .setColor(0xFFFF00) // Yellow
                .setTitle('⏰ User Timed Out')
                .setDescription(`**User:** ${targetUser.tag}\n**Duration:** ${readableDuration}\n**Reason:** ${reason}\n**Moderator:** ${interaction.user.tag}`)
                .setThumbnail(targetUser.displayAvatarURL());

            const thailandTime = moment().tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm');
            const timeButton = new ButtonBuilder()
                .setCustomId('to_timestamp')
                .setLabel(`${thailandTime} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(timeButton);

            await interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '<:no:1297814819105144862> An error occurred while timing out.', ephemeral: true });
        }
    }
};
