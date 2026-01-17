const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Ignore bots and DMs
        if (message.author.bot || !message.guild) return;

        // 2. Check for @everyone or @here
        const mentionRegex = /@(everyone|here)/;

        if (mentionRegex.test(message.content)) {

            // 3. Allow Staff (Users who actually have permission)
            if (message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                return; 
            }

            // 4. Action: Reply (No Delete)
            try {
                await message.reply({ 
                    content: "⛔ **Do not try again! Or you will be banned.**", 
                    
                    // 👇 This makes the bot Reply, but NOT ping the user
                    allowedMentions: { repliedUser: true } 
                });

            } catch (error) {
                console.error("AutoMod Error:", error);
            }
        }
    },
};
