const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits,
    ContainerBuilder,
    MessageFlags,
    SeparatorSpacingSize
} = require('discord.js');

const { createWelcomeImage } = require('../../../welcomeCanvas.js'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('Simulate the V2 welcome card for a specific user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the image for (default is you)')
        ),
    
    async execute(interaction) {
        await interaction.deferReply(); 

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            // 1. Generate Image
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });

            // 2. Mock Data 
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            const inviterName = interaction.user.username; 
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';

            // 3. Build Container (Using IDs from your Welcome Event)
            const mainContainer = new ContainerBuilder()
                .setAccentColor(0x888888) 

                // A. Main Section
                .addSectionComponents((section) => 
                    section
                        .addTextDisplayComponents(
                            (header) => header.setContent('### Welcome to A2-Q Server'),
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

                // B. Register Button
                .addActionRowComponents((row) => 
                    row.setComponents(
                        new ButtonBuilder()
                            .setLabel('Don’t Forget To Register')
                            .setEmoji('📝')
                            .setStyle(ButtonStyle.Link)
                            .setURL('https://discord.com/channels/1456197054782111756/1456197056250122352')
                    )
                )

                // C. Separator
                .addSeparatorComponents((sep) => 
                    sep.setSpacing(SeparatorSpacingSize.Small)
                )

                // D. Image Gallery
                .addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => 
                        item.setURL("attachment://welcome-image.png")
                    )
                );

            // 4. Send Result
            await interaction.editReply({ 
                content: `**[SIMULATION]** Welcome V2 Card for ${member.user.tag}`,
                flags: MessageFlags.IsComponentsV2, 
                files: [attachment], 
                components: [mainContainer] 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Something went wrong generating the V2 image.' });
        }
    }
};
