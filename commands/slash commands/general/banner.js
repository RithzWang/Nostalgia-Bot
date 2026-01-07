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
            // 1. Resolve User
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const targetMember = interaction.options.getMember('target') || interaction.member;

            if (!targetUser) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 2. Fetch User (Required for Banners)
            const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });

            // 3. Get URLs
            const globalBanner = fetchedUser.bannerURL({ size: 4096, forceStatic: false });
            const displayBanner = targetMember 
                ? targetMember.bannerURL({ size: 4096, forceStatic: false }) 
                : null;

            if (!globalBanner && !displayBanner) {
                return interaction.reply({ 
                    content: `❌ **${targetUser.username}** has no global or server banner set.`,
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 4. Static Timestamp
            const now = new Date();
            const staticTimeString = new Intl.DateTimeFormat('en-GB', { 
                timeZone: 'Asia/Bangkok', 
                day: '2-digit', month: '2-digit', year: 'numeric', 
                hour: '2-digit', minute: '2-digit', hour12: false 
            }).format(now);

            // 5. Build Container Helper
            const createBannerContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalBanner : displayBanner;
                const titleText = isShowingGlobal ? `## Global Banner` : `## Display Banner`;
                const displayName = targetMember ? targetMember.displayName : targetUser.username;
                const bodyText = isShowingGlobal ? `-# Global Banner of ${displayName}` : `-# Display Banner of ${displayName}`;

                // Buttons
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_banner')
                    .setStyle(ButtonStyle.Secondary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Display Banner');
                    if (!displayBanner) toggleButton.setDisabled(true).setLabel('No Display Banner');
                } else {
                    toggleButton.setLabel('Show Global Banner');
                    if (!globalBanner) toggleButton.setDisabled(true).setLabel('No Global Banner');
                }

                if (disableToggle) toggleButton.setDisabled(true);

                const timeButton = new ButtonBuilder()
                    .setCustomId('timestamp_btn')
                    .setLabel(`${staticTimeString} (GMT+7)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const browserButton = new ButtonBuilder()
                    .setLabel('Open in Browser')
                    .setStyle(ButtonStyle.Link);
                
                if (currentImage) browserButton.setURL(currentImage);
                else browserButton.setDisabled(true).setURL('https://discord.com');

                // Construct Container
                const container = new ContainerBuilder()
                    .setAccentColor(0x888888)
                    .addSectionComponents((section) => 
                        section
                            .addTextDisplayComponents((text) => text.setContent(`${titleText}\n${bodyText}`))
                            .setButtonAccessory(() => browserButton)
                    );

                if (currentImage) {
                    container.addMediaGalleryComponents((gallery) => gallery.addItems((item) => item.setURL(currentImage)))
                             .addSeparatorComponents((sep) => sep.setSpacing(SeparatorSpacingSize.Small));
                } else {
                    container.addSeparatorComponents((sep) => sep.setSpacing(SeparatorSpacingSize.Small));
                }

                container.addActionRowComponents((row) => row.setComponents(toggleButton, timeButton));
                return container;
            };

            // 6. Send Initial Reply
            let isGlobalMode = !!globalBanner;
            const initialContainer = createBannerContainer(isGlobalMode, false);

            const response = await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] }, 
                fetchReply: true
            });

            // ---------------------------------------------------------
            // ⚡ OPTIMIZATION CHECK ⚡
            // If we don't have BOTH banners, the button is already disabled forever.
            // We can STOP here. No Collector needed.
            // ---------------------------------------------------------
            const canToggle = globalBanner && displayBanner;
            if (!canToggle) return; 

            // 7. Collector (Only runs if toggling is possible)
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                idle: 60_000 
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: `Only <@${interaction.user.id}> can use this button!`, flags: [MessageFlags.Ephemeral] });
                }
                if (i.customId === 'toggle_banner') {
                    isGlobalMode = !isGlobalMode;
                    const newContainer = createBannerContainer(isGlobalMode, false);
                    await i.update({ components: [newContainer], flags: [MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } });
                }
            });

            collector.on('end', async () => {
                try {
                    const disabledContainer = createBannerContainer(isGlobalMode, true);
                    await interaction.editReply({ components: [disabledContainer], flags: [MessageFlags.IsComponentsV2], allowedMentions: { parse: [] } });
                } catch (e) { /* Ignore */ }
            });

        } catch (error) {
            console.error("Banner Command Error:", error);
            if (!interaction.replied) await interaction.reply({ content: `❌ **Error:** ${error.message}`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
