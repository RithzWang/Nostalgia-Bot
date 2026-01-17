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

        // 2. Global Bypass for Staff (Manage Messages)
        // This allows mods to bypass BOTH invite and mention checks
        if (message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return; 
        }

        const content = message.content;
        const author = message.author;
        const alertChannel = message.guild.channels.cache.get(ALERT_CHANNEL_ID);

        // ====================================================
        // PRIORITY 1: ANTI-INVITE (The Strict Check)
        // ====================================================
        const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)/i;

        if (inviteRegex.test(content)) {
            try {
                // A. DELETE immediately
                if (message.deletable) await message.delete();

                // B. Send Warning
                const warning = await message.channel.send(
                    `⛔ ${author}, Invites are not allowed here!`
                );
                setTimeout(() => warning.delete().catch(() => {}), 5000);

                // C. Log to Staff Channel
                if (alertChannel) {
                    const container = new ContainerBuilder().setAccentColor(0xED4245);
                    const section = new SectionBuilder()
                        .addTextDisplayComponents((text) => text.setContent('### ⛔ Invite Link Blocked'))
                        .addTextDisplayComponents((text) =>
                            text.setContent(`**User:** ${author}\n**Content:** \`${content}\`\n**Action:** Deleted`)
                        )
                        .setThumbnailAccessory((thumb) => thumb.setURL(author.displayAvatarURL()));

                    container.addSectionComponents(section);
                    await alertChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }
                
                return; // Stop processing

            } catch (error) {
                console.error("Anti-Invite Error:", error);
            }
        }

        // ====================================================
        // PRIORITY 2: ANTI-MENTION (The Soft Check)
        // ====================================================
        const mentionRegex = /@(everyone|here)/;

        if (mentionRegex.test(content)) {
            
            // 👇 NEW CHECK: If they have permission to Mention Everyone, let them do it.
            if (message.member.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
                return; 
            }

            try {
                // A. REPLY (Do NOT delete)
                await message.reply({
                    content: `⚠️ Please do not try to mention everyone/here`,
                    stickers: ['755490897143136446'],
                    allowedMentions: { repliedUser: true }
                });

                // B. Log to Staff Channel
                if (alertChannel) {
                    const container = new ContainerBuilder().setAccentColor(0xFEE75C);
                    const section = new SectionBuilder()
                        .addTextDisplayComponents((text) => text.setContent('### ⚠️ Mass Mention Attempt'))
                        .addTextDisplayComponents((text) =>
                            text.setContent(`**User:** ${author}\n**Channel:** ${message.channel}\n**Content:** \`${content}\`\n**Action:** Warned (Message Kept)`)
                        )
                        .setThumbnailAccessory((thumb) => thumb.setURL(author.displayAvatarURL()));

                    container.addSectionComponents(section);
                    await alertChannel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }

            } catch (error) {
                console.error("Anti-Mention Error:", error);
            }
        }
    },
};
