const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Ignore bots and Direct Messages
        if (message.author.bot || !message.guild) return;

        // 2. Check for Discord Invite Links
        // This Regex catches "discord.gg/" and "discord.com/invite/"
        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;

        if (inviteRegex.test(message.content)) {

            // 3. IGNORE ADMINISTRATORS
            // If the user has the 'Administrator' permission, we stop here.
            if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return; 
            }

            // 4. Action: Delete and Warn
            try {
                if (message.deletable) {
                    await message.delete();

                    // Send a temporary warning message
                    const warning = await message.channel.send(
                        `⛔ ${message.author}, Server invites are not allowed!`
                    );

                    // Delete the bot's warning after 5 seconds to keep chat clean
                    setTimeout(() => warning.delete().catch(() => {}), 5000);
                }
            } catch (error) {
                console.error("Anti-Invite Error:", error);
            }
        }
    },
};
