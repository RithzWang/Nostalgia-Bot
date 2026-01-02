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

// CHECK THIS PATH: Verify this path points correctly to your file
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
        // Step 1
        console.log("DEBUG: Step 1 - Deferring Reply");
        await interaction.deferReply(); 

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            // Step 2
            console.log("DEBUG: Step 2 - Generating Image");
            if (typeof createWelcomeImage !== 'function') {
                throw new Error("createWelcomeImage is NOT a function. Check your require path.");
            }
            const welcomeImageBuffer = await createWelcomeImage(member);

            if (!welcomeImageBuffer) {
                throw new Error("Image Buffer is empty/null!");
            }

            // Step 3
            console.log("DEBUG: Step 3 - Creating Attachment");
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });

            // Step 4
            console.log("DEBUG: Step 4 - Building Text Components");
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            const inviterName = interaction.user.username;
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';
            const colourEmbed = 0x888888; 

            const welcomeHeader = new TextDisplayBuilder();
            welcomeHeader.setContent('# Welcome to A2-Q Server');

            const welcomeBody = new TextDisplayBuilder();
            welcomeBody.setContent(`-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`);

            // Step 5
            console.log("DEBUG: Step 5 - Building Section (NO ACCESSORY)");
            const mainSection = new SectionBuilder();
            mainSection.addTextDisplayComponents(welcomeHeader);
            mainSection.addTextDisplayComponents(welcomeBody);

            // Step 6
            console.log("DEBUG: Step 6 - Building Buttons");
            const btn1 = new ButtonBuilder().setLabel('Info').setEmoji('📋').setStyle(ButtonStyle.Link).setURL('https://discord.com');
            const btn2 = new ButtonBuilder().setLabel('Reg').setEmoji('📝').setStyle(ButtonStyle.Link).setURL('https://google.com');
            const buttonRow = new ActionRowBuilder().addComponents(btn1, btn2);

            // Step 7
            console.log("DEBUG: Step 7 - Building Gallery");
            const gallery = new MediaGalleryBuilder();
            // This line is often the risky one in V2
            gallery.addImages({ url: 'attachment://welcome-image.png' });

            // Step 8
            console.log("DEBUG: Step 8 - Building Container");
            const separator = new SeparatorBuilder();
            separator.setSpacing(SeparatorSpacingSize.Small);

            const container = new ContainerBuilder();
            container.setAccentColor(colourEmbed);
            container.addSectionComponents(mainSection);
            container.addActionRowComponents(buttonRow);
            container.addSeparatorComponents(separator);
            container.addMediaGalleryComponents(gallery);

            // Step 9
            console.log("DEBUG: Step 9 - Sending Edit");
            await interaction.editReply({ 
                content: `**[DEBUG]** Welcome card for ${member.user.tag}`,
                components: [container], 
                files: [attachment], 
                flags: MessageFlags.IsComponentsV2 
            });
            console.log("DEBUG: Step 10 - Success!");

        } catch (error) {
            console.error("CAUGHT ERROR:", error);
            // Send the ACTUAL error to Discord
            await interaction.editReply({ 
                content: `❌ **CRASHED:**\n\`\`\`${error.toString()}\`\`\`` 
            });
        }
    }
};
