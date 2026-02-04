const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows available commands',
    async execute(message, args) {
        await message.reply({ 
            content: "`userinfo, ui, user, u` — shows user information\n`avatar, av` — shows user avatar\n`banner, bn` — shows user banner",
            flags: [MessageFlags.SuppressNotifications],
            allowedMentions: { repliedUser: false } 
        });
    }
};
