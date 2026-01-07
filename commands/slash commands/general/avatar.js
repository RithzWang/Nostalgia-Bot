const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, // Make sure this is imported
    ComponentType
} = require('discord.js');

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Shows the user avatar with a toggle for server avatar.')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the avatar for')
        ),

    async execute(interaction) {
        // ❌ No deferReply() here. 
        // This allows us to decide later if the message should be Public or Ephemeral.

        try {
            const member = interaction.options.getMember('target') || interaction.member;
            
            // 1. Error Check: User Not Found
            if (!member) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    // 👇 Using the Flag you requested
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            const user = member.user;

            // 2. Get URLs
            const globalAvatar = user.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            const displayAvatar = member.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            
            const hasServerAvatar = globalAvatar !== displayAvatar;

            // 3. Helper Function to Build Container
            const createAvatarContainer = (isShowingGlobal) => {
                const currentImage = isShowingGlobal ? globalAvatar : displayAvatar;
                const titleText = isShowingGlobal ? `### 🖼️ Avatar of <@${user.id}>` : `### 🖼️ Display Avatar of <@${user.id}>`;
                
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_avatar')
                    .setStyle(ButtonStyle.Primary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Display Avatar').setEmoji({ name: '🖼️' });
                    if (!hasServerAvatar) {
                        toggleButton.setDisabled(true).setLabel('No Display Avatar');
                    }
                } else {
                    toggleButton.setLabel('Show Global Avatar').setEmoji({ name: '🖼️' });
                }

                return new ContainerBuilder()
                    .addSectionComponents((section) => 
                        section
                            .addTextDisplayComponents((text) => text.setContent(titleText))
                            .setButtonAccessory(() => toggleButton)
                    )
                    .addActionRowComponents((row) => 
                        row.setComponents(
                            new ButtonBuilder()
                                .setLabel('Open in Browser')
                                .setStyle(ButtonStyle.Link)
                                .setURL(currentImage)
                        )
                    )
                    .addMediaGalleryComponents((gallery) => 
                        gallery.addItems((item) => item.setURL(currentImage))
                    );
            };

            // 4. Send Initial Reply (PUBLIC SUCCESS)
            // We combine flags here if needed, but for public messages, we usually just need IsComponentsV2
            let isGlobalMode = true;
            const initialContainer = createAvatarContainer(true);

            const response = await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] },
                fetchReply: true
            });

            // 5. Create Collector
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
            
            // 6. Error Handling (EPHEMERAL via FLAG)
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: `❌ **Error:** ${error.message}`, 
                    // 👇 This makes the error invisible to others
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }
    }
};
