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
        // 1. Defer Reply (Crucial for fetching data)
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
            // Force PNG for better compatibility with galleries
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

                    // Only add button if banner exists
                    if (globalBanner) {
                        section.setButtonAccessory((btn) => 
                            btn.setLabel('Link')
                               // 👇 THE FIX: Pass emoji as an object
                               .setEmoji({ name: '🖼️' })
                               .setStyle(ButtonStyle.Link)
                               .setURL(globalBanner)
                        );
                    }
                });

            // Only add image if banner exists
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
                               // 👇 THE FIX: Pass emoji as an object
                               .setEmoji({ name: '🖼️' })
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

            // 4. Send Response
            await interaction.editReply({ 
                components: componentsToSend, 
                flags: [MessageFlags.IsComponentsV2],
                allowedMentions: { parse: [] } 
            });

        } catch (error) {
            console.error("Banner Command Error:", error);
            await interaction.editReply({ content: `❌ **Error:** ${error.message}` });
        }
    }
};
