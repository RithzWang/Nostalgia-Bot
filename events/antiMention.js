const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Ignore bots and Direct Messages
        if (message.author.bot || !message.guild) return;

        // 2. Check if the message contains @everyone or @here
        // We use Regex to match exactly "@everyone" or "@here"
        const mentionRegex = /@(everyone|here)/;

        if (mentionRegex.test(message.content)) {

            // 3. Check Permissions (Allow Staff/Admins)
            // If the user HAS the Discord permission to "Mention Everyone", we let them do it.
            // If they DON'T have permission but typed it anyway, we punish them.
            if (message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                return; 
            }

            // 4. Action: Delete and Warn
            try {
                // Delete the bad message immediately
                if (message.deletable) {
                    await message.delete();
                }

                // Send the Warning
                const warning = await message.channel.send(
                    `⛔ ${message.author}, **Do not try again! Or you will be banned.**`
                );

                // Optional: Delete the warning after 5 seconds to keep chat clean
                setTimeout(() => warning.delete().catch(() => {}), 5000);

            } catch (error) {
                console.error("AutoMod Error:", error);
            }
        }
    },
};
