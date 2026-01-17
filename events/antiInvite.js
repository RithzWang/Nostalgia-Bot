const { 
    PermissionsBitField, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

// 👇 PASTE YOUR ALERT/LOG CHANNEL ID HERE
const ALERT_CHANNEL_ID = '1456197056988319869';

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const inviteRegex = /(discord\.gg\/|discord\.com\/invite\/)/i;

        if (inviteRegex.test(message.content)) {

            // Ignore Admins
            if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return; 
            }

            try {
                const content = message.content;
                const author = message.author;

                // 1. Delete Message
                if (message.deletable) {
                    await message.delete();

                    // Send Temp Warning
                    const warning = await message.channel.send(
                        `⛔ ${author}, **Server invites are not allowed!**`
                    );
                    setTimeout(() => warning.delete().catch(() => {}), 5000);
                }

                // 2. Send Container Alert to Staff Channel
                const alertChannel = message.guild.channels.cache.get(ALERT_CHANNEL_ID);
                if (alertChannel) {
                    
                    const container = new ContainerBuilder()
                        .setAccentColor(0xFEE75C); // 🟠 Orange/Yellow for Warning

                    // Header Section with Avatar
                    const section = new SectionBuilder()
                        .addTextDisplayComponents((text) =>
                            text.setContent('### ⚠️ Anti-Invite Triggered')
                        )
                        .addTextDisplayComponents((text) =>
                            text.setContent(
                                `**User:** ${author} (\`${author.id}\`)\n` +
                                `**Channel:** ${message.channel}\n` +
                                `**Message:** \`${content}\``
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
                console.error("Anti-Invite Error:", error);
            }
        }
    },
};
