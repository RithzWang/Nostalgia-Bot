const { 
    PermissionsBitField, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder
} = require('discord.js');

// 👇 PASTE YOUR ALERT/LOG CHANNEL ID HERE
const ALERT_CHANNEL_ID = '1456197056988319869'; 

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Ignore bots and Direct Messages
        if (message.author.bot || !message.guild) return;

        // 2. Check Regex
        const mentionRegex = /@(everyone|here)/;

        if (mentionRegex.test(message.content)) {

            // 3. Allow Staff
            if (message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                return; 
            }

            try {
                // Capture data before deleting
                const content = message.content;
                const author = message.author;

                // 4. DELETE the bad message
                if (message.deletable) {
                    await message.delete();
                }

                // 5. Send Temporary Warning
                const warning = await message.channel.send(
                    `⛔ ${author}, **Do not try again! Or you will be banned.**`
                );
                
                // Delete warning after 5 seconds
                setTimeout(() => warning.delete().catch(() => {}), 5000);

                // 6. Send Container Alert to Staff Channel
                const alertChannel = message.guild.channels.cache.get(ALERT_CHANNEL_ID);
                if (alertChannel) {
                    
                    const container = new ContainerBuilder()
                        .setAccentColor(0xED4245); // 🔴 Red for Danger

                    const section = new SectionBuilder()
                        .addTextDisplayComponents((text) =>
                            text.setContent('### ⚠️ Illegal Mention Attempt')
                        )
                        .addTextDisplayComponents((text) =>
                            text.setContent(
                                `**User:** ${author} (\`${author.id}\`)\n` +
                                `**Channel:** ${message.channel}\n` +
                                `**Content:** \`${content}\``
                            )
                        )
                        .setThumbnailAccessory((thumb) =>
                            thumb.setURL(author.displayAvatarURL())
                        );

                    container.addSectionComponents(section);

                    await alertChannel.send({ 
                        components: [container], 
                        flags: MessageFlags.IsComponentsV2 
                    });
                }

            } catch (error) {
                console.error("AutoMod Error:", error);
            }
        }
    },
};
