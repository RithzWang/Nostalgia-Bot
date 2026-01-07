const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags 
} = require('discord.js');

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Shows the global and server-specific banner.')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the banner for')
        ),

    async execute(interaction) {
        // 1. Defer Reply (Fetching banners takes time)
        await interaction.deferReply();

        try {
            const member = interaction.options.getMember('target') || interaction.member;
            
            if (!member) {
                return interaction.editReply({ content: "❌ User not found." });
            }

            // 2. Fetch Full User
            // We MUST fetch to get the banner (it's not always cached)
            const user = await interaction.client.users.fetch(member.id, { force: true });

            // 3. Get URLs
            const globalBanner = user.bannerURL({ size: 4096, extension: 'png', forceStatic: false });
            const displayBanner = member.bannerURL({ size: 4096, extension: 'png', forceStatic: false });

            const componentsToSend = [];

            // ---------------------------------------------
            // CONTAINER 1: GLOBAL BANNER
            // ---------------------------------------------
            const globalContainer = new ContainerBuilder()
                .addSectionComponents((section) => {
                    section.addTextDisplayComponents((text) => 
                        text.setContent(globalBanner 
                            ? `### Banner of <@${user.id}>`
                            : `### Banner of <@${user.id}>\n-# *User has no global banner set.*`
                        )
                    );

                    // Only add the button if there is a banner
                    if (globalBanner) {
                        section.setButtonAccessory((btn) => 
                            btn.setLabel('Link')
                               .setEmoji('🖼️')
                               .setStyle(ButtonStyle.Link)
                               .setURL(globalBanner)
                        );
                    }
                });

            // Only add the image gallery if there is a banner
            if (globalBanner) {
                globalContainer.addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => item.setURL(globalBanner))
                );
            }
            
            componentsToSend.push(globalContainer);

            // ---------------------------------------------
            // CONTAINER 2: SERVER BANNER (Display Profile)
            // ---------------------------------------------
            const displayContainer = new ContainerBuilder()
                .addSectionComponents((section) => {
                    section.addTextDisplayComponents((text) => 
                        text.setContent(displayBanner 
                            ? `### Display Banner of <@${user.id}>`
                            : `### Display Banner of <@${user.id}>\n-# *User has no server banner set.*`
                        )
                    );

                    if (displayBanner) {
                        section.setButtonAccessory((btn) => 
                            btn.setLabel('Link')
                               .setEmoji('🖼️')
                               .setStyle(ButtonStyle.Link)
                               .setURL(displayBanner)
                        );
                    }
                });

            if (displayBanner) {
                displayContainer.addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => item.setURL(displayBanner))
                );
            }

            componentsToSend.push(displayContainer);

            // ---------------------------------------------
            // SEND RESPONSE
            // ---------------------------------------------
            await interaction.editReply({ 
                components: componentsToSend, 
                flags: [MessageFlags.IsComponentsV2],
                allowedMentions: { parse: [] } 
            });

        } catch (error) {
            console.error("Banner Command Error:", error);
            const msg = `❌ **Error:** ${error.message}`;
            // Since we deferred, we must use editReply
            await interaction.editReply({ content: msg });
        }
    }
};
