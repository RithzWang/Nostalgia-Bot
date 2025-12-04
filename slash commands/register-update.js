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
        // 🔒 Strictly for Administrators
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('target');
        const newName = interaction.options.getString('name');
        const newCountry = interaction.options.getString('country');
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id);
        const registeredRoleId = '1446058693631148043';

        // --- CHECK 1: Does user have the role? ---
        if (!targetMember.roles.cache.has(registeredRoleId)) {
            return interaction.reply({ 
                content: `${targetUser} hasnt registered yet.`, 
                ephemeral: true 
            });
        }

        // --- CHECK 2: Bot Hierarchy / Owner Check ---
        if (!targetMember.manageable) {
            return interaction.reply({ 
                content: `❌ I cannot update ${targetUser}. They are the Server Owner or have a role higher than mine.`, 
                ephemeral: true 
            });
        }

        const newNickname = `${newCountry} | ${newName}`;

        // --- CHECK 3: Length Limit ---
        if (newNickname.length > 32) {
            return interaction.reply({ 
                content: `❌ Resulting nickname is too long: **${newNickname}** (${newNickname.length}/32)`, 
                ephemeral: true 
            });
        }

        try {
            // 1. Update the Nickname
            await targetMember.setNickname(newNickname);

            // 2. Prepare Timestamp (GMT+7)
            const now = new Date();
            const timeString = now.toLocaleString('en-GB', { 
                timeZone: 'Asia/Bangkok',
                hour12: false, 
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            // 3. Create Embed
            const embed = new EmbedBuilder()
                .setTitle('Update Registration')
                .setDescription(`Updated ${targetUser} to **${newNickname}**\nExecuted by ${interaction.user}`)
                .setColor(0x00FF00); // Green color for update

            // 4. Create Disabled Grey Button
            const button = new ButtonBuilder()
                .setCustomId('update_time_btn') 
                .setLabel(`${timeString} (GMT+7)`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(button);

            return interaction.reply({ 
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error(error);
            return interaction.reply({ 
                content: `❌ **Error:** Could not update nickname. Check my permissions.`, 
                ephemeral: true 
            });
        }
    },
};
