const { 
    PermissionsBitField, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder
} = require('discord.js');

// 👇 PASTE YOUR ALERT/LOG CHANNEL ID HERE
const ALERT_CHANNEL_ID = '123456789012345678'; 

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Ignore bots and Direct Messages
        if (message.author.bot || !message.guild) return;

        // 2. Allow Staff/Admins to bypass checks
        // (Change 'ManageMessages' to 'Administrator' if you want stricter rules)
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return; 
        }

        const content = message.content;
        const author = message.author;
        const alertChannel = message.guild.channels.cache.get(ALERT_CHANNEL_ID);

        // ====================================================
        // PRIORITY 1: ANTI-INVITE (The Strict Check)
        // ====================================================
        // Regex matches discord.gg, discord.com/invite, etc.
        const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)/i;

        if (inviteRegex.test(content)) {
            try {
                // A. DELETE immediately
                if (message.deletable) {
                    await message.delete();
                }

                // B. Send a temporary warning (deletes after 5s)
                const warning = await message.channel.send(
                    `⛔ ${author}, **Invites are not allowed here!**`
                );
                setTimeout(() => warning.delete().catch(() => {}), 5000);

                // C. Log to Staff Channel (RED for Danger)
                if (alertChannel) {
                    const container = new ContainerBuilder()
                        .setAccentColor(0xED4245); // 🔴 Red

                    const section = new SectionBuilder()
                        .addTextDisplayComponents((text) =>
                            text.setContent('### ⛔ Invite Link Blocked')
                        )
                        .addTextDisplayComponents((text) =>
                            text.setContent(
                                `**User:** ${author} (\`${author.id}\`)\n` +
                                `**Channel:** ${message.channel}\n` +
                                `**Content:** \`${content}\`\n` +
                                `**Action:** Deleted`
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
                
                // 🛑 STOP HERE: Do not check for mentions if we already deleted the message
                return; 

            } catch (error) {
                console.error("Anti-Invite Error:", error);
            }
        }

        // ====================================================
        // PRIORITY 2: ANTI-MENTION (The Soft Check)
        // ====================================================
        // We only reach this code if NO invite link was found.
        const mentionRegex = /@(everyone|here)/;

        if (mentionRegex.test(content)) {
            try {
                // A. REPLY to the user (Do NOT delete)
                await message.reply({
                    content: `⚠️ Please do not try to mention everyone/here`,
                    allowedMentions: { repliedUser: true }
                });

                // B. Log to Staff Channel (YELLOW for Warning)
                if (alertChannel) {
                    const container = new ContainerBuilder()
                        .setAccentColor(0xFEE75C); // 🟡 Yellow

                    const section = new SectionBuilder()
                        .addTextDisplayComponents((text) =>
                            text.setContent('### ⚠️ Mass Mention Detected')
                        )
                        .addTextDisplayComponents((text) =>
                            text.setContent(
                                `**User:** ${author} (\`${author.id}\`)\n` +
                                `**Channel:** ${message.channel}\n` +
                                `**Content:** \`${content}\`\n` +
                                `**Action:** Warned (Message Kept)`
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
                console.error("Anti-Mention Error:", error);
            }
        }
    },
};
