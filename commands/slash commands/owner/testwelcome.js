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

// ⚠️ PATH CHECK: Verify this relative path is correct
const { createWelcomeImage } = require('../../../welcomeCanvas7.js'); 

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('test-welcome')
        .setDescription('Simulate the welcome message with optional Nitro Theme testing')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the welcome for (defaults to you)')
        )
        // 1. Add Options for Mocking Nitro Colors
        .addStringOption(option => 
            option.setName('mock_primary')
            .setDescription('Hex Color for Top Gradient (e.g. #FF0000) - Simulates Nitro')
        )
        .addStringOption(option => 
            option.setName('mock_accent')
            .setDescription('Hex Color for Bottom Gradient (e.g. #0000FF) - Simulates Nitro')
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            const displayName = member.user.globalName || member.user.username;
            
            // 2. Retrieve Mock Colors
            const mockPrimary = interaction.options.getString('mock_primary');
            const mockAccent = interaction.options.getString('mock_accent');
            
            let themeColors = null;

            // 3. Process Mock Data (Convert Hex String -> Integer)
            if (mockPrimary && mockAccent) {
                // Remove '#' if present and parse to Integer
                const pInt = parseInt(mockPrimary.replace(/^#/, ''), 16);
                const aInt = parseInt(mockAccent.replace(/^#/, ''), 16);

                if (!isNaN(pInt) && !isNaN(aInt)) {
                    themeColors = [pInt, aInt];
                }
            } else if (mockPrimary || mockAccent) {
                // Fallback if they only provided one color (Just for testing convenience)
                // We'll use the provided color for both to make a solid block
                const colorStr = mockPrimary || mockAccent;
                const cInt = parseInt(colorStr.replace(/^#/, ''), 16);
                themeColors = [cInt, cInt];
            }

            // 4. Generate Image with Mock Data
            // We pass the themeColors array (or null) as the second argument
            const buffer = await createWelcomeImage(member, themeColors);
            
            const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });

            // 5. Mock Text Data
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            const inviterName = interaction.user.username; 
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';

            const mainContainer = new ContainerBuilder()
                .setAccentColor(0x888888)
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
                .addActionRowComponents((row) => 
                    row.setComponents(
                        new ButtonBuilder()
                            .setLabel('Register Here - Regístrate Aquí')
                            .setEmoji('1447143542643490848')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://discord.com/channels/1456197054782111756/1456197056250122352')
                    )
                )
                .addSeparatorComponents((sep) => 
                    sep.setSpacing(SeparatorSpacingSize.Small)
                )
                .addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => 
                        item.setURL("attachment://welcome-image.png").setDescription(`${displayName} (${member.user.username})`)
                    )
                );

            await interaction.editReply({ 
                flags: [MessageFlags.IsComponentsV2], 
                files: [attachment], 
                components: [mainContainer],
                allowedMentions: { users: [member.user.id] } 
            });

        } catch (error) {
            console.error("❌ Test Welcome Error:", error);
            await interaction.editReply({ content: `❌ Error generating welcome: \`${error.message}\`` });
        }
    }
};
