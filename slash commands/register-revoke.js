const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('register-revoke')
        .setDescription('Removes the registration role and resets the nickname.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The member to revoke')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        const registeredRoleId = '1446058693631148043';

        // --- CHECK 1: Bot Hierarchy ---
        if (!targetMember.manageable) {
            return interaction.reply({ 
                content: `❌ I cannot modify ${targetUser}. My role is likely too low.`, 
                ephemeral: true 
            });
        }

        // --- CHECK 2: Does user have the role? ---
        if (!targetMember.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ 
                content: `${targetUser} hasnt registered yet`, 
                ephemeral: true 
            });
        }

        try {
            // 1. Remove Role & Reset Nickname
            await targetMember.roles.remove(registeredRoleId);
            await targetMember.setNickname(null);

            // 2. Prepare Timestamp (GMT+7)
            // We get current time and format it to Asia/Bangkok time
            const now = new Date();
            const timeString = now.toLocaleString('en-GB', { 
                timeZone: 'Asia/Bangkok',
                hour12: false, // 24h format
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });

            // 3. Create Embed
            const embed = new EmbedBuilder()
                .setTitle('Revoke Registration')
                .setDescription(`for ${targetUser} by ${interaction.user}`)
                .setColor(0xFF0000); // Red color

            // 4. Create Disabled Grey Button
            const button = new ButtonBuilder()
                .setCustomId('revoke_time_btn') // ID is required even if disabled
                .setLabel(`${timeString} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary) // Grey
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(button);

            // 5. Send Response
            return interaction.reply({ 
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ 
                content: `❌ **Error:** Something went wrong. Check console.`, 
                ephemeral: true 
            });
        }
    },
};
