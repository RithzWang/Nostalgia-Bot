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
            // 1. Smart Fetch
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const targetMember = interaction.options.getMember('target') || interaction.member;

            if (!targetUser) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 2. Get URLs
            // 👇 CHANGE: Removed "extension: 'png'" so GIFs work now!
            const globalAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            
            const displayAvatar = targetMember 
                ? targetMember.displayAvatarURL({ size: 1024, forceStatic: false }) 
                : globalAvatar;

            // Check if they are actually different
            const hasServerAvatar = globalAvatar !== displayAvatar;

            // 3. CAPTURE TIME ONCE
            const now = new Date();
            const timeOptions = { 
                timeZone: 'Asia/Bangkok', 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', hour12: false 
            };
            const staticTimeString = new Intl.DateTimeFormat('en-GB', timeOptions).format(now);

            // 4. Helper Function
            const createAvatarContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalAvatar : displayAvatar;
                
                const titleText = isShowingGlobal 
                    ? `## Global Avatar` 
                    : `## Display Avatar`;
                
                const bodyText = isShowingGlobal
                    ? `-# Global Avatar of <@${targetUser.id}>`
                    : `-# Display Avatar of <@${targetUser.id}>`;

                // --- Buttons ---
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_avatar')
                    .setStyle(ButtonStyle.Secondary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Display Avatar');
                    if (!hasServerAvatar) {
                        toggleButton.setDisabled(true).setLabel('No Display Avatar');
                    }
                } else {
                    toggleButton.setLabel('Show Global Avatar');
                }

                if (disableToggle) {
                    toggleButton.setDisabled(true);
                }

                const timeButton = new ButtonBuilder()
                    .setCustomId('timestamp_btn')
                    .setLabel(`${staticTimeString} (GMT+7)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const browserButton = new ButtonBuilder()
                    .setLabel('Link')
                    .setStyle(ButtonStyle.Link)
                    .setURL(currentImage);

                // --- Build Container ---
                return new ContainerBuilder()
                    .setAccentColor(0x888888) 
                    
                    .addSectionComponents((section) => 
                        section
                            .addTextDisplayComponents((text) => 
                                text.setContent(`${titleText}\n${bodyText}`)
                            )
                            .setButtonAccessory(() => browserButton)
                    )
                    .addMediaGalleryComponents((gallery) => 
                        gallery.addItems((item) => item.setURL(currentImage))
                    )
                    .addSeparatorComponents((sep) => 
                        sep.setSpacing(SeparatorSpacingSize.Small)
                    )
                    .addActionRowComponents((row) => 
                        row.setComponents(toggleButton, timeButton)
                    );
            };

            // 5. Send Initial Reply
            let isGlobalMode = true;
            const initialContainer = createAvatarContainer(true, false);

            const response = await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] }, 
                fetchReply: true
            });

            // ⚡ OPTIMIZATION CHECK ⚡
            if (!hasServerAvatar) return;

            // 6. Collector
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                idle: 30_000 
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
                    const newContainer = createAvatarContainer(isGlobalMode, false);

                    await i.update({
                        components: [newContainer],
                        flags: [MessageFlags.IsComponentsV2],
                        allowedMentions: { parse: [] } 
                    });
                }
            });

            collector.on('end', async () => {
                try {
                    const disabledContainer = createAvatarContainer(isGlobalMode, true);
                    
                    await interaction.editReply({
                        components: [disabledContainer],
                        flags: [MessageFlags.IsComponentsV2],
                        allowedMentions: { parse: [] } 
                    });
                } catch (error) {
                    // Ignore error
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
