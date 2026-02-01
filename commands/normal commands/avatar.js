const { 
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
    name: 'avatar', // The command triggers on "av"
    aliases: ['av'],
    description: 'Shows user avatar',
    async execute(message, args) {
        try {
            // 1. Resolve User
            let targetUser = message.mentions.users.first();
            
            // Check ID if no mention
            if (!targetUser && args[0]) {
                try {
                    targetUser = await message.client.users.fetch(args[0]);
                } catch (e) { targetUser = null; }
            }
            // Default to author
            if (!targetUser && !args[0]) targetUser = message.author;

            if (!targetUser) {
                return message.reply({ content: "<:No:1297814819105144862> User not found.", flags: [MessageFlags.Ephemeral] });
            }

            // 2. Fetch Member
            let targetMember = null;
            try {
                targetMember = await message.guild.members.fetch(targetUser.id);
            } catch (err) { targetMember = null; }

            // 3. Logic
            const globalAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const displayAvatar = targetMember ? targetMember.displayAvatarURL({ size: 1024, forceStatic: false }) : globalAvatar;
            const hasServerAvatar = globalAvatar !== displayAvatar;

            const createAvatarContainer = (isShowingGlobal, disableToggle = false) => {
                const currentImage = isShowingGlobal ? globalAvatar : displayAvatar;
                const titleText = isShowingGlobal ? `## Avatar` : `## Pre-server Avatar`;
                const bodyText = isShowingGlobal ? `-# Avatar of <@${targetUser.id}>` : `-# Pre-server Avatar of <@${targetUser.id}>`;

                const toggleButton = new ButtonBuilder()
                    .setCustomId('toggle_av_msg')
                    .setStyle(ButtonStyle.Secondary);

                if (isShowingGlobal) {
                    toggleButton.setLabel('Show Pre-server Avatar');
                    if (!hasServerAvatar) toggleButton.setDisabled(true).setLabel('No Pre-server Avatar');
                } else {
                    toggleButton.setLabel('Show Global Avatar');
                }
                if (disableToggle) toggleButton.setDisabled(true);

                return new ContainerBuilder()
                    .setAccentColor(0x888888)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${titleText}\n${bodyText}`))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(currentImage)))
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
                    .addActionRowComponents(new ActionRowBuilder().addComponents(toggleButton));
            };

            let isGlobalMode = true;
            const sentMessage = await message.reply({ 
                components: [createAvatarContainer(true)], 
                flags: [MessageFlags.IsComponentsV2],
                allowedMentions: { parse: [] } 
            });

            if (!hasServerAvatar) return;

            const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.Button, idle: 60_000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== message.author.id) return i.reply({ content: `<:No:1297814819105144862> Only <@${message.author.id}> can use this button`, flags: [MessageFlags.Ephemeral] });
                isGlobalMode = !isGlobalMode;
                await i.update({ components: [createAvatarContainer(isGlobalMode)], flags: [MessageFlags.IsComponentsV2] });
            });

            collector.on('end', () => {
                sentMessage.edit({ components: [createAvatarContainer(isGlobalMode, true)], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
            });

        } catch (error) {
            console.error(error);
            message.reply(`<:No:1297814819105144862> Error: ${error.message}`);
        }
    }
};
