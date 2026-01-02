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
        .setDescription('Simulate the welcome card with debug info')
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
            const welcomeHeader = new TextDisplayBuilder();
            welcomeHeader.setContent('# Welcome to A2-Q Server');

            const welcomeBody = new TextDisplayBuilder();
            welcomeBody.setContent(`-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`);

            const mainSection = new SectionBuilder();
            mainSection.addTextDisplayComponents(welcomeHeader);
            mainSection.addTextDisplayComponents(welcomeBody);

            // --- SUPER SAFE AVATAR ADDER ---
            // This block checks available commands and prints them to console
            try {
                console.log("--- DEBUGGING SECTION BUILDER ---");
                // This prints the SECRET command names to your console
                const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(mainSection));
                console.log("Available Methods:", methods);
                console.log("---------------------------------");

                const avatarObj = { url: member.user.displayAvatarURL({ extension: 'png' }) };

                // Try to find the right command automatically
                if (typeof mainSection.setAccessory === 'function') {
                    mainSection.setAccessory(avatarObj);
                } else if (typeof mainSection.setAccessoryComponent === 'function') {
                    mainSection.setAccessoryComponent(avatarObj);
                } else if (typeof mainSection.addAccessoryComponent === 'function') {
                    mainSection.addAccessoryComponent(avatarObj);
                } else if (typeof mainSection.addAccessory === 'function') {
                    mainSection.addAccessory(avatarObj);
                } else {
                    console.log("⚠️ Could not find a method to add Avatar. Check the list above in console!");
                }
            } catch (err) {
                console.log("Avatar failed to load, but bot is staying alive:", err.message);
            }
            // -------------------------------

            // Buttons
            const btn1 = new ButtonBuilder().setLabel('Info').setEmoji('📋').setStyle(ButtonStyle.Link).setURL('https://discord.com');
            const btn2 = new ButtonBuilder().setLabel('Reg').setEmoji('📝').setStyle(ButtonStyle.Link).setURL('https://google.com');
            const buttonRow = new ActionRowBuilder().addComponents(btn1, btn2);

            // Gallery (Using correct addItems)
            const gallery = new MediaGalleryBuilder();
            gallery.addItems({ url: 'attachment://welcome-image.png' });

            // Container
            const separator = new SeparatorBuilder();
            separator.setSpacing(SeparatorSpacingSize.Small);

            const container = new ContainerBuilder();
            container.setAccentColor(colourEmbed);
            container.addSectionComponents(mainSection);
            container.addActionRowComponents(buttonRow);
            container.addSeparatorComponents(separator);
            container.addMediaGalleryComponents(gallery);

            // Send
            await interaction.editReply({ 
                content: `**[SIMULATION]** Welcome card for ${member.user.tag}`,
                components: [container], 
                files: [attachment], 
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error("Critical Error:", error);
            await interaction.editReply({ content: 'Something went wrong, check console.' });
        }
    }
};
