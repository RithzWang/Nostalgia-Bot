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
        .setName('avatar')
        .setDescription('Shows the user avatar')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the avatar for')
        ),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const targetMember = interaction.options.getMember('target') || interaction.member;

            if (!targetUser) {
                return interaction.reply({ 
                    content: "<:No:1297814819105144862> User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            const globalAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const displayAvatar = targetMember 
                ? targetMember.displayAvatarURL({ size: 1024, forceStatic: false }) 
                : globalAvatar;

            const hasServerAvatar = globalAvatar !== displayAvatar;

            // --- Helper to Build Container ---
            const createAvatarContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalAvatar : displayAvatar;
                
                const titleText = isShowingGlobal ? `## Avatar` : `## Pre-server Avatar`;
                const bodyText = isShowingGlobal 
                    ? `-# Avatar of <@${targetUser.id}>` 
                    : `-# Pre-server Avatar of <@${targetUser.id}>`;

                // Button Logic
                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_avatar')
                    .setStyle(ButtonStyle.Secondary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Pre-server Avatar');
                    if (!hasServerAvatar) toggleButton.setDisabled(true).setLabel('No Pre-server Avatar');
                } else {
                    toggleButton.setLabel('Show Global Avatar');
                }

                if (disableToggle) toggleButton.setDisabled(true);

                // Build Container using explicit classes
                return new ContainerBuilder()
                    .setAccentColor(0x888888)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${titleText}\n${bodyText}`)
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                    )
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                            new MediaGalleryItemBuilder().setURL(currentImage)
                        )
                    )
                    .addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
                    )
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(toggleButton)
                    );
            };

            // --- Send Initial Reply ---
            let isGlobalMode = true;
            const initialContainer = createAvatarContainer(true, false);

            await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] }
            });

            // Fetch explicitly to avoid deprecation warning
            const response = await interaction.fetchReply();

            // --- Collector Logic ---
            if (!hasServerAvatar) return;

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
                } catch (e) { /* Ignore */ }
            });

        } catch (error) {
            console.error("Avatar Command Error:", error);
            if (!interaction.replied) {
                await interaction.reply({ 
                    content: `<:No:1297814819105144862> Error: ${error.message}`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        }
    }
};
