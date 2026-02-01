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
        .setName('banner')
        .setDescription('Shows the user banner')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the banner for')
        ),

    async execute(interaction) {
        try {
            // 1. Resolve User & Member Correctly
            const targetUser = interaction.options.getUser('target') || interaction.user;
            
            // Logic: If target is provided, try to get member. If not, use command runner.
            let targetMember;
            if (interaction.options.getUser('target')) {
                targetMember = interaction.options.getMember('target');
            } else {
                targetMember = interaction.member;
            }

            if (!targetUser) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 2. Fetch User (Required to get the Global Banner)
            // We force fetch to ensure we get the banner image
            const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });

            // 3. Get URLs
            // size: 4096 gives the highest quality
            const globalBanner = fetchedUser.bannerURL({ size: 4096, forceStatic: false });
            
            // If targetMember is null (user not in server), displayBanner is null
            const displayBanner = targetMember 
                ? targetMember.bannerURL({ size: 4096, forceStatic: false }) 
                : null;

            // 4. Validation: If no banners exist at all
            if (!globalBanner && !displayBanner) {
                return interaction.reply({ 
                    content: `❌ **${targetUser.username}** has no global or pre-server banner set.`,
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 5. Build Container Function
            const createBannerContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalBanner : displayBanner;
                
                // Set Titles
                const titleText = isShowingGlobal ? `## Banner` : `## Pre-server Banner`;
                const bodyText = isShowingGlobal 
                    ? `-# Banner of <@${targetUser.id}>` 
                    : `-# Pre-server Banner of <@${targetUser.id}>`;

                // --- Button Logic ---
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_banner')
                    .setStyle(ButtonStyle.Secondary);

                // Configure Button State
                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Pre-server Banner');
                    if (!displayBanner) {
                        toggleButton.setDisabled(true).setLabel('No Pre-server Banner');
                    }
                } else {
                    toggleButton.setLabel('Show Global Banner');
                    if (!globalBanner) {
                        toggleButton.setDisabled(true).setLabel('No Global Banner');
                    }
                }

                if (disableToggle) toggleButton.setDisabled(true);

                // --- Construct Container ---
                const container = new ContainerBuilder()
                    .setAccentColor(0x888888);

                // Section: Text only (Removed Browser Button Accessory)
                container.addSectionComponents((section) => 
                    section.addTextDisplayComponents((text) => 
                        text.setContent(`${titleText}\n${bodyText}`)
                    )
                );

                // Media: The Image
                if (currentImage) {
                    container.addMediaGalleryComponents((gallery) => 
                        gallery.addItems((item) => item.setURL(currentImage))
                    );
                    
                    // Separator for spacing
                    container.addSeparatorComponents((sep) => 
                        sep.setSpacing(SeparatorSpacingSize.Small)
                    );
                } else {
                    // Fallback separator if image is missing (rare edge case)
                    container.addSeparatorComponents((sep) => 
                        sep.setSpacing(SeparatorSpacingSize.Small)
                    );
                }

                // Action Row: Toggle Button Only (Removed Timestamp)
                container.addActionRowComponents((row) => 
                    row.setComponents(toggleButton)
                );

                return container;
            };

            // 6. Send Initial Reply
            // Default to Global Banner if it exists, otherwise Server Banner
            let isGlobalMode = !!globalBanner; 
            
            const initialContainer = createBannerContainer(isGlobalMode, false);

            const response = await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] }, 
                fetchReply: true
            });

            // ⚡ OPTIMIZATION: If user only has one type of banner, stop here.
            const canToggle = globalBanner && displayBanner;
            if (!canToggle) return; 

            // 7. Collector (Handles Button Clicks)
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                idle: 60_000 // 60 seconds
            });

            collector.on('collect', async (i) => {
                // Security: Only the command runner can click
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: `Only <@${interaction.user.id}> can use this button`, 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                if (i.customId === 'toggle_banner') {
                    isGlobalMode = !isGlobalMode;
                    const newContainer = createBannerContainer(isGlobalMode, false);
                    
                    await i.update({ 
                        components: [newContainer], 
                        flags: [MessageFlags.IsComponentsV2], 
                        allowedMentions: { parse: [] } 
                    });
                }
            });

            collector.on('end', async () => {
                try {
                    // Disable buttons when time runs out
                    const disabledContainer = createBannerContainer(isGlobalMode, true);
                    await interaction.editReply({ 
                        components: [disabledContainer], 
                        flags: [MessageFlags.IsComponentsV2], 
                        allowedMentions: { parse: [] } 
                    });
                } catch (e) { 
                    // Ignore errors if message was deleted
                }
            });

        } catch (error) {
            console.error("Banner Command Error:", error);
            // Handle crash gracefully
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: `❌ **Error:** ${error.message}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }
    }
};
