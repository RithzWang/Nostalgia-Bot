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
        .setName('avatar')
        .setDescription('Shows the global and server-specific display avatar.')
        .setDMPermission(false)
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the avatar for')
        ),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const member = interaction.options.getMember('target') || interaction.member;
            if (!member) return interaction.editReply({ content: "❌ User not found." });

            const user = member.user;

            // Get URLs (Force PNG)
            const globalAvatar = user.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });
            const displayAvatar = member.displayAvatarURL({ size: 1024, extension: 'png', forceStatic: false });

            const componentsToSend = [];

            // --- CONTAINER 1: GLOBAL AVATAR ---
            const globalContainer = new ContainerBuilder()
                .addSectionComponents((section) => 
                    section
                        .addTextDisplayComponents((text) => 
                            text.setContent(`### Avatar of <@${user.id}>`)
                        )
                        .setButtonAccessory((btn) => 
                            btn.setLabel('Link to Global')
                               // 👇 THE FIX: Pass emoji as an object { name: '...' }
                               .setEmoji({ name: '🖼️' }) 
                               .setStyle(ButtonStyle.Link)
                               .setURL(globalAvatar)
                        )
                )
                .addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => item.setURL(globalAvatar))
                );
            
            componentsToSend.push(globalContainer);

            // --- CONTAINER 2: DISPLAY AVATAR ---
            const displayContainer = new ContainerBuilder()
                .addSectionComponents((section) => 
                    section
                        .addTextDisplayComponents((text) => 
                            text.setContent(`### Display Avatar of <@${user.id}>`)
                        )
                        .setButtonAccessory((btn) => 
                            btn.setLabel('Link to Display')
                               // 👇 THE FIX: Pass emoji as an object { name: '...' }
                               .setEmoji({ name: '🖼️' })
                               .setStyle(ButtonStyle.Link)
                               .setURL(displayAvatar)
                        )
                )
                .addMediaGalleryComponents((gallery) => 
                    gallery.addItems((item) => item.setURL(displayAvatar))
                );

            componentsToSend.push(displayContainer);

            // Send Response
            await interaction.editReply({ 
                components: componentsToSend, 
                flags: [MessageFlags.IsComponentsV2],
                allowedMentions: { parse: [] } 
            });

        } catch (error) {
            console.error("Avatar Command Error:", error);
            await interaction.editReply({ content: `❌ **Error:** ${error.message}` });
        }
    }
};
