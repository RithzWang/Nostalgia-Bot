const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    SeparatorSpacingSize 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Shows the global and server-specific display avatar.')
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to fetch the avatar for')
        ),

    async execute(interaction) {
        const member = interaction.options.getMember('target') || interaction.member;
        const user = member.user;

        // 1. Get URLs
        // Global Avatar (User profile)
        const globalAvatar = user.displayAvatarURL({ size: 4096, forceStatic: false });
        // Server Display Avatar (Guild profile) - This falls back to global if no specific server avatar exists
        const displayAvatar = member.displayAvatarURL({ size: 4096, forceStatic: false });

        // 2. Build Container
        const avatarContainer = new ContainerBuilder()
            
            // --- SECTION 1: GLOBAL AVATAR ---
            .addSectionComponents((section) => 
                section.addTextDisplayComponents((text) => 
                    text.setContent(`### Avatar of <@${user.id}>`)
                )
            )
            .addActionRowComponents((row) => 
                row.setComponents(
                    new ButtonBuilder()
                        .setLabel('Link to Global Avatar')
                        .setStyle(ButtonStyle.Link)
                        .setURL(globalAvatar)
                )
            )
            .addMediaGalleryComponents((gallery) => 
                gallery.addItems((item) => item.setURL(globalAvatar))
            )

            // --- SEPARATOR ---
            .addSeparatorComponents((sep) => 
                sep.setSpacing(SeparatorSpacingSize.Small)
            )

            // --- SECTION 2: DISPLAY AVATAR ---
            .addSectionComponents((section) => 
                section.addTextDisplayComponents((text) => 
                    text.setContent(`### Display Avatar of <@${user.id}>`)
                )
            )
            .addActionRowComponents((row) => 
                row.setComponents(
                    new ButtonBuilder()
                        .setLabel('Link to Display Avatar')
                        .setStyle(ButtonStyle.Link)
                        .setURL(displayAvatar)
                )
            )
            .addMediaGalleryComponents((gallery) => 
                gallery.addItems((item) => item.setURL(displayAvatar))
            );

        // 3. Send Response
        await interaction.reply({ 
            components: [avatarContainer], 
            flags: [MessageFlags.IsComponentsV2],
            // ⚠️ This ensures the @Mention inside the text DOES NOT ping the user
            allowedMentions: { parse: [] } 
        });
    }
};
