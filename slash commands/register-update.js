const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    Colors 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register-update')
        .setDescription('Force update a member\'s registration details.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to update')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('name')
                .setDescription('New name')
                .setRequired(true)
                .setMaxLength(25)
        )
        .addStringOption(option => 
            option.setName('country')
                .setDescription('New country flag')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const newName = interaction.options.getString('name');
        const newCountry = interaction.options.getString('country');
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        const registeredRoleId = '1446058693631148043';
        const logChannelId = '1187771223791378522'; // 📜 LOG CHANNEL ID

        if (!targetMember.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ content: `${targetUser} hasnt registered yet.`, ephemeral: true });
        }

        if (!targetMember.manageable) {
            return interaction.reply({ content: `❌ I cannot update ${targetUser}.`, ephemeral: true });
        }

        const newNickname = `${newCountry} | ${newName}`;

        if (newNickname.length > 32) {
            return interaction.reply({ content: `❌ Nickname too long: **${newNickname}**`, ephemeral: true });
        }

        try {
            await targetMember.setNickname(newNickname);

            // Prepare Embed & Button
            const now = new Date();
            const timeString = now.toLocaleString('en-GB', { 
                timeZone: 'Asia/Bangkok', hour12: false,
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            const embed = new EmbedBuilder()
                .setTitle('Update Registration')
                .setDescription(`Updated ${targetUser} to **${newNickname}**\nExecuted by ${interaction.user}`)
                .setColor(Colors.Blue);

            const button = new ButtonBuilder()
                .setCustomId('update_time_btn') 
                .setLabel(`${timeString} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(button);

            // 📜 Send to Log Channel
            const logChannel = interaction.guild.channels.cache.get(logChannelId);
            if (logChannel) await logChannel.send({ embeds: [embed], components: [row] });

            // Reply to Admin
            return interaction.reply({ embeds: [embed], components: [row] });

        } catch (error) {
            console.error(error);
            return interaction.reply({ content: `❌ Error updating nickname.`, ephemeral: true });
        }
    },
};
