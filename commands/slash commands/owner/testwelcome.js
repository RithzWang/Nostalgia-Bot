const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    AttachmentBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    SeparatorSpacingSize 
} = require('discord.js');

// ⚠️ PATH CHECK: 
// Verify this path points to your actual welcomeCanvas4.js file relative to this command file.
const { createWelcomeImage } = require('../../../welcomeCanvas6.js'); 

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('test-welcome')
        .setDescription('Simulate the welcome message for a user')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the welcome for (defaults to you)')
        ),

    async execute(interaction) {
        // 1. Defer Reply
        await interaction.deferReply();

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            // 2. Generate Image
            const buffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });

            // 3. Mock Data
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            // Fake inviter data (Simulates you as the inviter)
            const inviterName = interaction.user.username; 
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';

            // 4. Build Container
            const mainContainer = new ContainerBuilder()
                .setAccentColor(0x888888)
                
                // A. Main Section (Text + Avatar)
                .addSectionComponents((section) => 
                    section
                        .addTextDisplayComponents(
                            (header) => header.setContent('### Welcome to A2-Q Realm'),
                            (body) => body.setContent(
                                `-# <@${member.user.id}> \`(${member.user.username})\`\n` +
                                `-# <:calendar:1456242387243499613> Account Created: ${accountCreated}\n` +
                                `-# <:users:1456242343303971009> Member Count: \`${memberCount}\`\n` +
                                `-# <:chain:1456242418717556776> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
                            )
                        )
                        .setThumbnailAccessory((thumb) => 
                            thumb.setURL(member.user.displayAvatarURL())
                        )
                )

                // B. Buttons (Register Button)
                .addActionRowComponents((row) => 
                    row.setComponents(
                        new ButtonBuilder()
                            .setLabel('Register Here - Regístrate Aquí')
                            .setEmoji('1447143542643490848')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://discord.com/channels/1456197054782111756/1456197056250122352')
                    )
                )

                // C. Separator
                .addSeparatorComponents((sep) => 
                    sep.setSpacing(SeparatorSpacingSize.Small)
                )

                // D. Media Gallery (The Welcome Image)
                .addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => 
                        item.setURL("attachment://welcome-image.png")
                    )
                );

            // 5. Send Message with Fix
            await interaction.editReply({ 
                flags: [MessageFlags.IsComponentsV2], 
                files: [attachment], 
                components: [mainContainer],
                
                // 👇 THE FIX: Only allow the 'target' member to be pinged. 
                // This blocks the 'Invited by' ping.
                allowedMentions: { users: [member.user.id] } 
            });

        } catch (error) {
            console.error("❌ Test Welcome Error:", error);
            await interaction.editReply({ content: `❌ Error generating welcome: \`${error.message}\`` });
        }
    }
};
