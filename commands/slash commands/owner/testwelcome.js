const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    MessageFlags,
    // V2 Imports
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ImageBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const { createWelcomeImage } = require('../../../welcomeCanvas.js'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('Simulate the welcome card for a specific user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the image for (default is you)')
        ),
    
    async execute(interaction) {
        // Enable Ephemeral (Hidden) mode if you prefer, or keep standard
        await interaction.deferReply(); 

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            // 1. Generate the Image
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });

            // 2. Prepare Data
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            const inviterName = interaction.user.username;
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';
            const colourEmbed = 0x888888; // Use Hex number for V2 (0x...) instead of string '#'

            // 3. Build V2 Components
            
            // A. Text Content
            const welcomeHeader = new TextDisplayBuilder()
                .setContent('# Welcome to A2-Q Server');
                
            const welcomeBody = new TextDisplayBuilder()
                .setContent(`-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`);

            // B. Section (Groups Text + Avatar Thumbnail)
            const mainSection = new SectionBuilder()
                .addTextDisplayComponents(welcomeHeader)
                .addTextDisplayComponents(welcomeBody)
                .setAccessory(
                    new ImageBuilder().setUrl(member.user.displayAvatarURL({ extension: 'png', size: 256 }))
                );

            // C. Button Row
            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(`${member.user.id}`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('1441133157855395911')
                    .setCustomId('hello_button_disabled')
                    .setDisabled(true)
            );

            // D. Welcome Image Gallery
            const gallery = new MediaGalleryBuilder()
                .addImages(
                    new ImageBuilder().setUrl('attachment://welcome-image.png')
                );

            // E. Separator (Optional, adds a line between text and image)
            const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);

            // 4. Build Final Container
            const container = new ContainerBuilder()
                .setAccentColor(colourEmbed)
                .addSectionComponents(mainSection)  // Text + Thumbnail
                .addActionRowComponents(buttonRow)  // ID Button
                .addSeparatorComponents(separator)  // Line
                .addMediaGalleryComponents(gallery); // Big Image

            // 5. Send Response
            await interaction.editReply({ 
                content: `**[SIMULATION]** Welcome card for ${member.user.tag}`,
                components: [container], 
                files: [attachment], 
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Something went wrong generating the image.' });
        }
    }
};
