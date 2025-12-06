const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    MessageFlags,
    Colors 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register-revoke')
        .setDescription('Revoke an member registration')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to revoke')
                .setRequired(true)
        )
        // ⚠️ FIXED: Changed 'ADMINISTRATION' (invalid) to 'Administrator'
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        const registeredRoleId = '1446058693631148043';
        const logChannelId = '1187771223791378522'; 

        if (!targetMember.manageable) {
            return interaction.reply({ content: `❌ I cannot modify ${targetUser}.`, flags: MessageFlags.Ephemeral });
        }

        if (!targetMember.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ content: `${targetUser} hasnt registered yet`, flags: MessageFlags.Ephemeral });
        }

        try {
            await targetMember.roles.remove(registeredRoleId);
            await targetMember.setNickname(null);

            // Prepare Embed & Button
            const now = new Date();
            const timeString = now.toLocaleString('en-GB', { 
                timeZone: 'Asia/Bangkok', hour12: false, 
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            const embed = new EmbedBuilder()
                .setTitle('Revoke Registration')
                .setDescription(`User: ${targetUser}\nExecuted by ${interaction.user}`)
                .setColor(Colors.Red) // ✅ FIXED: Removed the semicolon here
                .setThumbnail(targetMember.user.displayAvatarURL());

            const button = new ButtonBuilder()
                .setCustomId('revoke_time_btn')
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
            return interaction.reply({ content: `❌ Error executing revoke.`, flags: MessageFlags.Ephemeral });
        }
    },
};
