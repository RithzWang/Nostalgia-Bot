const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user to check (Leave empty for yourself)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // 1. Get User
        let user = interaction.options.getUser('target') || interaction.user;

        // Fetch user to get 'accentColor' (Profile Background Color)
        try {
            user = await user.fetch(true);
        } catch (err) {
            console.log("Could not fetch full user profile", err);
        }

        const member = await interaction.guild.members.fetch(user.id).catch(() => null);

        // 2. Determine Embed Color
        let embedColor = 0x808080;
        if (user.accentColor) {
            embedColor = user.accentColor;
        } else if (member && member.displayColor !== 0) {
            embedColor = member.displayColor;
        }

        // 3. Timestamps
        const createdTimestamp = Math.floor(user.createdTimestamp / 1000);
        const joinedTimestamp = member ? Math.floor(member.joinedTimestamp / 1000) : null;

        // 4. Roles
        let rolesString = "Not in server";
        if (member) {
            const roles = member.roles.cache
                .filter(r => r.name !== '@everyone')
                .sort((a, b) => b.position - a.position)
                .map(r => `<@&${r.id}>`);
            
            if (roles.length > 20) {
                rolesString = `${roles.slice(0, 20).join(', ')} ...and ${roles.length - 20} more`;
            } else if (roles.length > 0) {
                rolesString = roles.join(', ');
            } else {
                rolesString = "None";
            }
        }

        // 5. Build Embed (Author Removed)
        const embed = new EmbedBuilder()
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 512 }))
            .setColor(embedColor)
            .addFields(
                { name: '👤 Identity', value: `**Name:** ${user.globalName || user.username}\n**Username:** ${user.username}\n**ID:** ${user.id}`, inline: false },
                
                { name: '📅 Dates', value: `**Joined Discord:** <t:${createdTimestamp}:F> (<t:${createdTimestamp}:R>)\n**Joined Server:** ${joinedTimestamp ? `<t:${joinedTimestamp}:F> (<t:${joinedTimestamp}:R>)` : "Not a member"}`, inline: false },
                
                { name: `🎭 Roles (${member ? member.roles.cache.size - 1 : 0})`, value: rolesString, inline: false }
            );

        // 6. Create GMT+7 Timestamp Button
        const now = new Date();
        const timeString = now.toLocaleString('en-GB', { 
            timeZone: 'Asia/Bangkok',
            hour12: false,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const timeButton = new ButtonBuilder()
            .setCustomId('userinfo_time')
            .setLabel(`${timeString} (GMT+7)`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true);

        const row = new ActionRowBuilder().addComponents(timeButton);

        return interaction.reply({ embeds: [embed], components: [row] });
    }
};
