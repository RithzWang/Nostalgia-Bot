const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ComponentType,
    SeparatorSpacingSize 
} = require('discord.js');

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Shows the user avatar')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the avatar for')
        ),

    async execute(interaction) {
        try {
            const member = interaction.options.getMember('target') || interaction.member;
            
            if (!member) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            const user = member.user;

            // 1. Get URLs
            const globalAvatar = user.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            const displayAvatar = member.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            
            const hasServerAvatar = globalAvatar !== displayAvatar;

            // 2. Helper Function to Build Container
            const createAvatarContainer = (isShowingGlobal) => {
                const currentImage = isShowingGlobal ? globalAvatar : displayAvatar;
                const titleText = isShowingGlobal 
                    ? `### 🖼️ Avatar of <@${user.id}>` 
                    : `### 🛡️ Display Avatar of <@${user.id}>`;
                
                // --- Button Definitions ---
                
                // Button 1: Toggle (Grey, Goes to Bottom)
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_avatar')
                    .setStyle(ButtonStyle.Secondary); // Grey Style

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Display Avatar').setEmoji({ name: '🛡️' });
                    if (!hasServerAvatar) {
                        toggleButton.setDisabled(true).setLabel('No Display Avatar');
                    }
                } else {
                    toggleButton.setLabel('Show Global Avatar').setEmoji({ name: '🖼️' });
                }

                // Button 2: Browser Link (Goes to Top Right)
                const browserButton = new ButtonBuilder()
                    .setLabel('Open in Browser')
                    .setStyle(ButtonStyle.Link)
                    .setURL(currentImage);

                // --- Container Construction ---
                return new ContainerBuilder()
                    // A. Top Section (Header + Open in Browser Button)
                    .addSectionComponents((section) => 
                        section
                            .addTextDisplayComponents((text) => text.setContent(titleText))
                            // 👇 "Open in Browser" moved here
                            .setButtonAccessory(() => browserButton)
                    )
                    
                    // B. The Image (Middle)
                    .addMediaGalleryComponents((gallery) => 
                        gallery.addItems((item) => item.setURL(currentImage))
                    )

                    // C. Separator
                    .addSeparatorComponents((sep) => 
                        sep.setSpacing(SeparatorSpacingSize.Small)
                    )

                    // D. Bottom Row (Toggle Button)
                    .addActionRowComponents((row) => 
                        // 👇 Toggle Button moved here
                        row.setComponents(toggleButton)
                    );
            };

            // 3. Send Initial Reply
            let isGlobalMode = true;
            const initialContainer = createAvatarContainer(true);

            const response = await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] },
                fetchReply: true
            });

            // 4. Collector
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: `Only <@${interaction.user.id}> can use this button!`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                if (i.customId === 'toggle_avatar') {
                    isGlobalMode = !isGlobalMode;
                    const newContainer = createAvatarContainer(isGlobalMode);

                    await i.update({
                        components: [newContainer],
                        flags: [MessageFlags.IsComponentsV2]
                    });
                }
            });

        } catch (error) {
            console.error("Avatar Command Error:", error);
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: `❌ **Error:** ${error.message}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }
    }
};
