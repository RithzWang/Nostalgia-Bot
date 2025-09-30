const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'info',
    description: 'Displays detailed information about a user.',
    execute(message, args) {
        const target = message.mentions.members.first() || message.member;
        const user = target.user;
        const presence = target.presence;

        // Status mapping
        const statusMap = {
            online: '🟢 Online',
            idle: '🌙 Idle',
            dnd: '⛔ Do Not Disturb',
            offline: '⚫ Offline / Invisible'
        };
        const status = presence ? statusMap[presence.status] : '⚫ Offline / Invisible';

        // Activity
        let activity = 'None';
        if (presence && presence.activities.length > 0) {
            const act = presence.activities[0];
            if (act.type === 4) {
                activity = act.state || 'Custom Status';
            } else {
                activity = `${act.type.toLowerCase()} ${act.name}`;
            }
        }

        // Roles
        const roles = target.roles.cache
            .filter(r => r.id !== message.guild.id)
            .map(r => r.toString())
            .join(', ') || 'None';
        const highestRole = target.roles.highest.name || 'None';

        // Permissions
        const perms = target.permissions.toArray().join(', ') || 'None';

        // Boosting info
        const isBoosting = target.premiumSince ? `Yes (since <t:${Math.floor(target.premiumSinceTimestamp / 1000)}:R>)` : 'No';

        // Voice channel
        const voiceChannel = target.voice.channel ? target.voice.channel.name : 'Not connected';

        const embed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle(`${user.username}'s Full Info`)
            .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .setImage(user.bannerURL({ dynamic: true, size: 1024 }) || null)
            .addFields(
                { name: 'Username', value: `${user.tag}`, inline: true },
                { name: 'User ID', value: `${user.id}`, inline: true },
                { name: 'Nickname', value: target.nickname || 'None', inline: true },
                { name: 'Bot?', value: user.bot ? 'Yes 🤖' : 'No', inline: true },
                { name: 'Status', value: status, inline: true },
                { name: 'Activity', value: activity, inline: true },
                { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: false },
                { name: 'Joined Server', value: target.joinedTimestamp ? `<t:${Math.floor(target.joinedTimestamp / 1000)}:R>` : 'N/A', inline: false },
                { name: 'Boosting', value: isBoosting, inline: true },
                { name: 'Voice Channel', value: voiceChannel, inline: true },
                { name: 'Highest Role', value: highestRole, inline: true },
                { name: 'Roles', value: roles, inline: false },
                { name: 'Permissions', value: perms, inline: false }
            )
            .setFooter({ text: `Requested by ${message.author.tag}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    },
};