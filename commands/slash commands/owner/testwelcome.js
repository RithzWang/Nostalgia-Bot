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
    SeparatorSpacingSize,
    ThumbnailBuilder  // <--- ADDED THIS IMPORT
} = require('discord.js');

const { createWelcomeImage } = require('../../../welcomeCanvas.js'); 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('testwelcome')
        .setDescription('Simulate the welcome card for a specific user')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to generate the image for')
        ),
    
    async execute(interaction) {
        await interaction.deferReply(); 

        try {
            const member = interaction.options.getMember('target') || interaction.member;

            // 1. Generate Image
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });

            // 2. Prepare Data
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = interaction.guild.memberCount;
            const inviterName = interaction.user.username;
            const inviterId = interaction.user.id;
            const inviteCode = 'TEST-CODE';
            const colourEmbed = 0x888888; 

            // 3. Build Components

            // A. Text
            const welcomeHeader = new TextDisplayBuilder();
            welcomeHeader.setContent('# Welcome to A2-Q Server');

            const welcomeBody = new TextDisplayBuilder();
            welcomeBody.setContent(`-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`);

            // B. Section with Avatar (FIXED)
            const mainSection = new SectionBuilder();
            mainSection.addTextDisplayComponents(welcomeHeader);
            mainSection.addTextDisplayComponents(welcomeBody);

            // Using the command found in your logs: setThumbnailAccessory
            const avatarThumbnail = new ThumbnailBuilder();
            avatarThumbnail.setUrl(member.user.displayAvatarURL({ extension: 'png' }));
            mainSection.setThumbnailAccessory(avatarThumbnail);

            // C. Buttons
            const btn1 = new ButtonBuilder().setLabel('Information').setEmoji('📋').setStyle(ButtonStyle.Link).setURL('https://discord.com');
            const btn2 = new ButtonBuilder().setLabel('Registration').setEmoji('📝').setStyle(ButtonStyle.Link).setURL('https://google.com');
            const buttonRow = new ActionRowBuilder().addComponents(btn1, btn2);

            // D. Gallery (Using addItems as proven before)
            const gallery = new MediaGalleryBuilder();
            gallery.addItems({ url: 'attachment://welcome-image.png' });

            // E. Container
            const separator = new SeparatorBuilder();
            separator.setSpacing(SeparatorSpacingSize.Small);

            const container = new ContainerBuilder();
            container.setAccentColor(colourEmbed);
            container.addSectionComponents(mainSection);
            container.addActionRowComponents(buttonRow);
            container.addSeparatorComponents(separator);
            container.addMediaGalleryComponents(gallery);

            // 4. Send
            await interaction.editReply({ 
                content: `**[SIMULATION]** Welcome card for ${member.user.tag}`,
                components: [container], 
                files: [attachment], 
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: 'Something went wrong. Check console.' });
        }
    }
};
