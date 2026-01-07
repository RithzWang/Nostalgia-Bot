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
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the banner for')
        ),

    async execute(interaction) {
        try {
            // 1. Resolve User/Member
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const targetMember = interaction.options.getMember('target') || interaction.member;

            if (!targetUser) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 2. FORCE FETCH USER
            // Crucial: Banners are not sent in standard interaction objects. We must fetch the API.
            // We defer reply because this might take a few milliseconds.
            /* NOTE: Since we want to use the Collector logic from the Avatar command (public reply),
               we won't defer here. But usually fetching takes < 3 seconds.
               If you get timeouts, we might need to change strategy, but for now we keep it consistent.
            */
            const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });

            // 3. Get URLs
            // We use { forceStatic: false } to allow GIFs
            const globalBanner = fetchedUser.bannerURL({ size: 4096, forceStatic: false });
            
            // Member might be null in DMs. Also member.bannerURL returns null if no server banner exists.
            const displayBanner = targetMember 
                ? targetMember.bannerURL({ size: 4096, forceStatic: false }) 
                : null;

            // 4. Quick Exit if NO banners exist at all
            if (!globalBanner && !displayBanner) {
                return interaction.reply({ 
                    content: `❌ **${targetUser.username}** has no global or server banner set.`,
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 5. Static Timestamp (Calculated once)
            const now = new Date();
            const timeOptions = { 
                timeZone: 'Asia/Bangkok', 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', hour12: false 
            };
            const staticTimeString = new Intl.DateTimeFormat('en-GB', timeOptions).format(now);

            // 6. Helper Function to Build Container
            const createBannerContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalBanner : displayBanner;
                
                // --- Text Logic ---
                // Shows "Global Banner" or "Display Banner"
                const titleText = isShowingGlobal 
                    ? `## Global Banner` 
                    : `## Display Banner`;
                
                // Get display name for the body text
                const displayName = targetMember ? targetMember.displayName : targetUser.username;

                const bodyText = isShowingGlobal
                    ? `-# Global Banner of ${displayName}`
                    : `-# Display Banner of ${displayName}`;

                // --- Buttons ---
                
                // A. Toggle Button
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_banner')
                    .setStyle(ButtonStyle.Secondary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Display Banner');
                    // If no display banner exists, disable the button
                    if (!displayBanner) {
                        toggleButton.setDisabled(true).setLabel('No Display Banner');
                    }
                } else {
                    toggleButton.setLabel('Show Global Banner');
                    // If no global banner exists, disable the button (Rare, but possible)
                    if (!globalBanner) {
                        toggleButton.setDisabled(true).setLabel('No Global Banner');
                    }
                }

                // Force disable on timeout
                if (disableToggle) {
                    toggleButton.setDisabled(true);
                }

                // B. Timestamp Button
                const timeButton = new ButtonBuilder()
                    .setCustomId('timestamp_btn')
                    .setLabel(`${staticTimeString} (GMT+7)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                // C. Browser Link
                const browserButton = new ButtonBuilder()
                    .setLabel('Link')
                    .setStyle(ButtonStyle.Link);

                // Logic for Browser Button: If no image, disable link or remove url
                if (currentImage) {
                    browserButton.setURL(currentImage);
                } else {
                    browserButton.setDisabled(true).setURL('https://discord.com'); // Dummy URL required if disabled
                }

                // --- Build Container ---
                const container = new ContainerBuilder()
                    .setAccentColor(0x888888)
                    
                    // Top Section
                    .addSectionComponents((section) => 
                        section
                            .addTextDisplayComponents((text) => 
                                text.setContent(`${titleText}\n${bodyText}`)
                            )
                            .setButtonAccessory(() => browserButton)
                    )
                    
                    // Bottom Section
                    .addActionRowComponents((row) => 
                        row.setComponents(toggleButton, timeButton)
                    );

                // Middle Image Section (Only add if image exists)
                if (currentImage) {
                    container
                        .addMediaGalleryComponents((gallery) => 
                            gallery.addItems((item) => item.setURL(currentImage))
                        )
                        .addSeparatorComponents((sep) => 
                            sep.setSpacing(SeparatorSpacingSize.Small)
                        );
                } else {
                    // If no image (e.g. they have display banner but switched to empty global)
                    container.addSeparatorComponents((sep) => sep.setSpacing(SeparatorSpacingSize.Small));
                }

                return container;
            };

            // 7. Send Initial Reply
            // Default to Global, unless Global is missing and Display exists
            let isGlobalMode = !!globalBanner; 
            
            const initialContainer = createBannerContainer(isGlobalMode, false);

            const response = await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] }, 
                fetchReply: true
            });

            // 8. Collector
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
                    const disabledContainer = createBannerContainer(isGlobalMode, true);
                    
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
            console.error("Banner Command Error:", error);
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: `❌ **Error:** ${error.message}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }
    }
};
