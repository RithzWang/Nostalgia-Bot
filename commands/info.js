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
            idle: '🟡 Idle',
            dnd: '🔴 Do Not Disturb',
            offline: '⚫ Offline'
        };
        const status = presence ? statusMap[presence.status] : statusMap.offline;

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
            .join(' ') || 'None';
        const highestRole = target.roles.highest.id || 'None';

        // Boosting info
        const isBoosting = target.premiumSince ? `Yes (since ${target.premiumSince.toDateString()})` : 'No';

        // Voice channel
        const voiceChannel = target.voice.channel ? target.voice.channel.name : 'Not connected';

        // Color
        const colourEmbed = '#888888';

        const embed = new Discord.MessageEmbed()
            .setTitle('𝐔𝐬𝐞𝐫 𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧')
            .setDescription(
                `👤 **Username:** ${user.tag}\n` +
                `🆔 **ID:** ${user.id}\n` +
                `📛 **Nickname:** ${target.nickname || 'None'}\n` +
                `🤖 **Bot?:** ${user.bot ? 'Yes' : 'No'}\n` +
                `💠 **Status:** ${status}\n` +
                `🎮 **Activity:** ${activity}\n` +
                `📅 **Account Created:** ${user.createdAt.toDateString()}\n` +
                `⏰ **Joined Server:** ${target.joinedAt ? target.joinedAt.toDateString() : 'N/A'}\n` +
                `✨ **Boosting:** ${isBoosting}\n` +
                `🎤 **Voice Channel:** ${voiceChannel}\n` +
                `🏅 **Highest Role:** <@&${highestRole}>\n` +
                `🛡️ **Roles:** ${roles}`
            )
            .setColor(colourEmbed)
            .setFooter(`• ${user.tag}`, user.displayAvatarURL())
            .setTimestamp();

        message.channel.send(embed);
    },
};