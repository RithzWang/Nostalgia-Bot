const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

const { createWelcomeImage } = require('../../../welcomeCanvas.js'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('Debug the welcome card')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the image for')
        ),
    
    async execute(interaction) {
        console.log("DEBUG: Step 1 - Deferring Reply");
        await interaction.deferReply(); 

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            console.log("DEBUG: Step 2 - Generating Image");
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });

            console.log("DEBUG: Step 3 - Prepared Data");
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            const inviterName = interaction.user.username;
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';
            const colourEmbed = 0x888888; 

            // Text Components
            const welcomeHeader = new TextDisplayBuilder();
            welcomeHeader.setContent('# Welcome to A2-Q Server');

            const welcomeBody = new TextDisplayBuilder();
            welcomeBody.setContent(`-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`);

            // Section
            const mainSection = new SectionBuilder();
            mainSection.addTextDisplayComponents(welcomeHeader);
            mainSection.addTextDisplayComponents(welcomeBody);

            // Buttons
            const btn1 = new ButtonBuilder().setLabel('Info').setEmoji('📋').setStyle(ButtonStyle.Link).setURL('https://discord.com');
            const btn2 = new ButtonBuilder().setLabel('Reg').setEmoji('📝').setStyle(ButtonStyle.Link).setURL('https://google.com');
            const buttonRow = new ActionRowBuilder().addComponents(btn1, btn2);

            // Gallery
            console.log("DEBUG: Step 7 - Building Gallery (FIXED METHOD)");
            const gallery = new MediaGalleryBuilder();
            
            // --- FIX IS HERE ---
            // Changed from .addImages -> .addImageComponents
            gallery.addImageComponents({ url: 'attachment://welcome-image.png' });

            // Separator
            const separator = new SeparatorBuilder();
            separator.setSpacing(SeparatorSpacingSize.Small);

            // Container
            console.log("DEBUG: Step 8 - Building Container");
            const container = new ContainerBuilder();
            container.setAccentColor(colourEmbed);
            container.addSectionComponents(mainSection);
            container.addActionRowComponents(buttonRow);
            container.addSeparatorComponents(separator);
            container.addMediaGalleryComponents(gallery);

            console.log("DEBUG: Step 9 - Sending");
            await interaction.editReply({ 
                content: `**[DEBUG]** Welcome card for ${member.user.tag}`,
                components: [container], 
                files: [attachment], 
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error("CAUGHT ERROR:", error);
            await interaction.editReply({ 
                content: `❌ **CRASHED:**\n\`\`\`${error.toString()}\`\`\`` 
            });
        }
    }
};
