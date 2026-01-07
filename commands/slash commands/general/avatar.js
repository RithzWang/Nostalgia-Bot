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
        .setDMPermission(false) // Note: This actually blocks DMs. Remove if you want DMs.
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the avatar for')
        ),

    async execute(interaction) {
        try {
            // 1. Smart Fetch: Try to get Member (Server), fallback to User (DM)
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const targetMember = interaction.options.getMember('target') || interaction.member;

            if (!targetUser) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 2. Get URLs
            const globalAvatar = targetUser.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            const displayAvatar = targetMember 
                ? targetMember.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false }) 
                : globalAvatar;

            const hasServerAvatar = globalAvatar !== displayAvatar;

            // 3. Helper Function to Build Container
            // 👇 Added 'disableToggle' parameter here
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
                    .setStyle(ButtonStyle.Primary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Display Avatar');
                    if (!hasServerAvatar) {
                        toggleButton.setDisabled(true).setLabel('No Display Avatar');
                    }
                } else {
                    toggleButton.setLabel('Show Global Avatar');
                }

                // 👇 Check if we need to force disable (due to timeout)
                if (disableToggle) {
                    toggleButton.setDisabled(true);
                }

                const now = new Date();
                const options = { 
                    timeZone: 'Asia/Bangkok', 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit', hour12: false 
                };
                const timeString = new Intl.DateTimeFormat('en-GB', options).format(now);

                const timeButton = new ButtonBuilder()
                    .setCustomId('timestamp_btn')
                    .setLabel(`${timeString} (GMT+7)`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true);

                const browserButton = new ButtonBuilder()
                    .setLabel('Open in Browser')
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

            // 4. Send Initial Reply
            let isGlobalMode = true;
            // Pass 'false' because we just started, so it's not disabled yet
            const initialContainer = createAvatarContainer(true, false);

            const response = await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] },
                fetchReply: true
            });

            // 5. Collector
            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                idle: 30_000 // 👇 30 Seconds of IDLE time (resets if clicked)
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
                    // Pass 'false' because the collector is still active
                    const newContainer = createAvatarContainer(isGlobalMode, false);

                    await i.update({
                        components: [newContainer],
                        flags: [MessageFlags.IsComponentsV2]
                    });
                }
            });

            // 👇 Handle Timeout (Disable Button)
            collector.on('end', async () => {
                try {
                    // Rebuild the container one last time with disableToggle = true
                    const disabledContainer = createAvatarContainer(isGlobalMode, true);
                    
                    await interaction.editReply({
                        components: [disabledContainer],
                        flags: [MessageFlags.IsComponentsV2]
                    });
                } catch (error) {
                    // Ignore error if message was deleted/unknown
                    // console.error("Could not disable buttons:", error);
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
