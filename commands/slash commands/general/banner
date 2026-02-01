const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ComponentType,
    SeparatorSpacingSize,
    TextDisplayBuilder,      
    SeparatorBuilder,        
    MediaGalleryBuilder,     
    MediaGalleryItemBuilder, 
    ActionRowBuilder         
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
            const targetUser = interaction.options.getUser('target') || interaction.user;
            let targetMember;
            if (interaction.options.getUser('target')) {
                targetMember = interaction.options.getMember('target');
            } else {
                targetMember = interaction.member;
            }

            if (!targetUser) {
                return interaction.reply({ 
                    content: "<:No:1297814819105144862> User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            const fetchedUser = await interaction.client.users.fetch(targetUser.id, { force: true });
            const globalBanner = fetchedUser.bannerURL({ size: 4096, forceStatic: false });
            const displayBanner = targetMember 
                ? targetMember.bannerURL({ size: 4096, forceStatic: false }) 
                : null;

            if (!globalBanner && !displayBanner) {
                return interaction.reply({ 
                    content: `<:No:1297814819105144862> **${targetUser.username}** has no global or pre-server banner set.`,
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // --- Helper to Build Container ---
            const createBannerContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalBanner : displayBanner;
                
                const titleText = isShowingGlobal ? `## Banner` : `## Pre-server Banner`;
                const bodyText = isShowingGlobal 
                    ? `-# Banner of <@${targetUser.id}>` 
                    : `-# Pre-server Banner of <@${targetUser.id}>`;

                // Button Logic
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_banner')
                    .setStyle(ButtonStyle.Secondary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Pre-server Banner');
                    if (!displayBanner) toggleButton.setDisabled(true).setLabel('No Pre-server Banner');
                } else {
                    toggleButton.setLabel('Show Global Banner');
                    if (!globalBanner) toggleButton.setDisabled(true).setLabel('No Global Banner');
                }

                if (disableToggle) toggleButton.setDisabled(true);

                // Build Container using explicit classes
                const container = new ContainerBuilder()
                    .setAccentColor(0x888888)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${titleText}\n${bodyText}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                    );

                if (currentImage) {
                    container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(currentImage)
                        )
                    );
                }

                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(toggleButton)
                );

                return container;
            };

            // --- Send Initial Reply ---
            let isGlobalMode = !!globalBanner;
            const initialContainer = createBannerContainer(isGlobalMode, false);

            await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] }
            });

            // Fetch explicitly to avoid deprecation warning
            const response = await interaction.fetchReply();

            // --- Collector Logic ---
            const canToggle = globalBanner && displayBanner;
            if (!canToggle) return; 

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                idle: 60_000 
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ 
                        content: `<:No:1297814819105144862> Only <@${interaction.user.id}> can use this button`, 
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
                } catch (e) { /* Ignore */ }
            });

        } catch (error) {
            console.error("Banner Command Error:", error);
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: `<:No:1297814819105144862> Error: ${error.message}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }
    }
};
