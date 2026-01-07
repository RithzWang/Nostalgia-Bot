const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Shows the global and server-specific display avatar.')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the avatar for')
        ),

    async execute(interaction) {
        try {
            const member = interaction.options.getMember('target') || interaction.member;
            
            if (!member) {
                return interaction.reply({ content: "❌ User not found.", ephemeral: true });
            }

            const user = member.user;

            // 1. Get URLs
            // Using PNG ensures the image renders correctly in the gallery
            const globalAvatar = user.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            const displayAvatar = member.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });

            // ---------------------------------------------
            // CONTAINER 1: GLOBAL AVATAR
            // ---------------------------------------------
            const globalContainer = new ContainerBuilder()
                .addSectionComponents((section) => 
                    section
                        .addTextDisplayComponents((text) => 
                            text.setContent(`### Avatar of <@${user.id}>`)
                        )
                        // Using 'setButtonAccessory' puts the button nicely next to the text
                        // matching the style in your provided snippet
                        .setButtonAccessory((btn) => 
                            btn.setLabel('Link')
                               .setEmoji('🖼️')
                               .setStyle(ButtonStyle.Link)
                               .setURL(globalAvatar)
                        )
                )
                .addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => item.setURL(globalAvatar))
                );

            // ---------------------------------------------
            // CONTAINER 2: DISPLAY AVATAR (Server Profile)
            // ---------------------------------------------
            const displayContainer = new ContainerBuilder()
                .addSectionComponents((section) => 
                    section
                        .addTextDisplayComponents((text) => 
                            text.setContent(`### Display Avatar of <@${user.id}>`)
                        )
                        .setButtonAccessory((btn) => 
                            btn.setLabel('Link')
                               .setEmoji('🖼️')
                               .setStyle(ButtonStyle.Link)
                               .setURL(displayAvatar)
                        )
                )
                .addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => item.setURL(displayAvatar))
                );

            // ---------------------------------------------
            // SEND RESPONSE
            // ---------------------------------------------
            await interaction.reply({ 
                // We send BOTH containers in the array
                components: [globalContainer, displayContainer], 
                flags: [MessageFlags.IsComponentsV2],
                allowedMentions: { parse: [] } 
            });

        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                await interaction.reply({ content: `❌ **Error:** ${error.message}`, ephemeral: true });
            }
        }
    }
};
