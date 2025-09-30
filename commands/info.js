const Discord = require('discord.js');

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
            if (act.type === 'CUSTOM_STATUS') {
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

        // Color
        const colourEmbed = '#888888';

        const embed = new Discord.MessageEmbed()
            .setTitle(`━━━━━━ User Info ━━━━━━`)
            .setDescription(
                `**Username:** ${user.tag}\n` +
                `**User ID:** ${user.id}\n` +
                `**Nickname:** ${target.nickname || 'None'}\n` +
                `**Bot?:** ${user.bot ? 'Yes 🤖' : 'No'}\n` +
                `**Status:** ${status}\n` +
                `**Activity:** ${activity}\n` +
                `**Account Created:** ${user.createdAt.toDateString()}\n` +
                `**Joined Server:** ${target.joinedAt ? target.joinedAt.toDateString() : 'N/A'}\n` +
                `**Boosting:** ${isBoosting}\n` +
                `**Voice Channel:** ${voiceChannel}\n` +
                `**Highest Role:** ${highestRole}\n` +
                `**Roles:** ${roles}\n` +
                `**Permissions:** ${perms}`
            )
            .setColor(colourEmbed)
            .setFooter(`• ${user.tag}`, user.displayAvatarURL());

        message.channel.send(embed);
    },
};