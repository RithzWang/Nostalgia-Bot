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
            // 1. Resolve User
            const targetUser = interaction.options.getUser('target') || interaction.user;
            const targetMember = interaction.options.getMember('target') || interaction.member;

            if (!targetUser) {
                return interaction.reply({ 
                    content: "❌ User not found.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            // 2. Get URLs
            const globalAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const displayAvatar = targetMember 
                ? targetMember.displayAvatarURL({ size: 1024, forceStatic: false }) 
                : globalAvatar;

            const hasServerAvatar = globalAvatar !== displayAvatar;

            // 3. Container Helper
            const createAvatarContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalAvatar : displayAvatar;
                const titleText = isShowingGlobal ? `## Avatar` : `## Pre-server Avatar`;
                const bodyText = isShowingGlobal
                    ? `-# Avatar of <@${targetUser.id}>`
                    : `-# Pre-server Avatar of <@${targetUser.id}>`;

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

                const container = new ContainerBuilder().setAccentColor(0x888888);

                container.addSectionComponents((section) => 
                    section.addTextDisplayComponents((text) => text.setContent(`${titleText}\n${bodyText}`))
                );

                if (currentImage) {
                    container.addMediaGalleryComponents((gallery) => 
                        gallery.addItems((item) => item.setURL(currentImage))
                    );
                }

                container.addSeparatorComponents((sep) => sep.setSpacing(SeparatorSpacingSize.Small));
                container.addActionRowComponents((row) => row.setComponents(toggleButton));

                return container;
            };

            // 4. Send Initial Reply
            let isGlobalMode = true;
            const initialContainer = createAvatarContainer(true, false);

            // ⬇️ FIX: Removed fetchReply: true
            await interaction.reply({ 
                components: [initialContainer], 
                flags: [MessageFlags.IsComponentsV2], 
                allowedMentions: { parse: [] }
            });

            // ⬇️ FIX: Explicitly fetch the response here
            const response = await interaction.fetchReply();

            // 5. Collector
            if (!hasServerAvatar) return;

            const collector = response.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                idle: 60_000 
            });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: `Only <@${interaction.user.id}> can use this button`, flags: [MessageFlags.Ephemeral] });
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
            if (!interaction.replied) await interaction.reply({ content: `❌ **Error:** ${error.message}`, flags: [MessageFlags.Ephemeral] });
        }
    }
};
