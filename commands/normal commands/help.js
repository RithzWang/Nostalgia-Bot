const { MessageFlags } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows available commands',
    async execute(message, args) {
        await message.reply({ 
            content: "`userinfo, ui, user, u @user` — shows user information\n`avatar, av @user` — shows user avatar\n`banner, bn @user` — shows user banner",
            flags: [MessageFlags.SuppressNotifications],
            allowedMentions: { repliedUser: false } 
        });
    }
};
