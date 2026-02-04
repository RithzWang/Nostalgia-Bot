const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows available commands',
    // Same allowed channels as userinfo
    channels: ['1456197056510165026', '1456197056510165029', '1456197056988319870'], 

    async execute(message, args) {
        // Optional manual check (if your handler doesn't check 'channels' automatically)
        if (this.channels && !this.channels.includes(message.channel.id)) return;

        await message.reply({ 
            content: "`userinfo, ui, user, u` — shows user information\n`avatar, av` — shows user avatar\n`banner, bn` — shows user banner",
            flags: [MessageFlags.SuppressNotifications],
            allowedMentions: { repliedUser: false } 
        });
    }
};
