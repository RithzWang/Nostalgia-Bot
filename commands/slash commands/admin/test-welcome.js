const { 
    SlashCommandBuilder, 
    MessageFlags, 
    AttachmentBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ActionRowBuilder, 
    SeparatorBuilder, 
    MediaGalleryBuilder,        
    MediaGalleryItemBuilder,    
    SeparatorSpacingSize,
    PermissionFlagsBits 
} = require('discord.js');

const { createWelcomeImage } = require('../../../welcomeCanvas12.js'); // Adjust path if needed
const { fetchAdvancedProfile } = require('../../../utils/v9Scraper'); // Adjust path if needed

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-welcome')
        .setDescription('Simulate the welcome message and image generator.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addUserOption(opt => opt.setName('target')
            .setDescription('Test the welcome image on a specific user (defaults to you)')
            .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUserOption = interaction.options.getUser('target') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUserOption.id).catch(() => null);

        if (!member) {
            return interaction.editReply({ content: "❌ **Error:** Could not find that member in this server." });
        }

        try {
            // ✅ FIX 1: Added .catch(() => null) to prevent API crashes
            const v9Data = await fetchAdvancedProfile(member.id).catch(() => null);
            let themeColors = null;

            if (v9Data && v9Data.user_profile?.theme_colors) {
                themeColors = v9Data.user_profile.theme_colors; 
            }

            const { welcomeImage } = await createWelcomeImage(member, themeColors);
            
            const welcomeFileName = `${member.user.id}-welcome-image.png`;
            const files = [new AttachmentBuilder(welcomeImage, { name: welcomeFileName })];
            
            const mainContainer = new ContainerBuilder()
                .setAccentColor(8947848) 
                .addSectionComponents(
                    new SectionBuilder()
                        // ✅ FIX 2: Grouped both text displays into a single method call
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`### السلام عليكم ورحمة الله وبركاته`),
                            new TextDisplayBuilder().setContent(`Welcome <@${member.user.id}> to **${member.guild.name}**\nWe hope you enjoy your stay here!`)
                        )
                )
                .addActionRowComponents(
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setLabel("Our Tags")
                                .setEmoji({ name: '🏷️' })
                                .setURL("https://discord.com/channels/1456197054782111756/1456197056250122353"),
                            new ButtonBuilder()
                                .setStyle(ButtonStyle.Link)
                                .setLabel("Register")
                                .setEmoji({ name: '📝' })
                                .setURL("https://discord.com/channels/1456197054782111756/1456197056250122352")
                        )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addMediaGalleryComponents(
                    new MediaGalleryBuilder()
                        .addItems(
                            new MediaGalleryItemBuilder()
                                .setURL(`attachment://${welcomeFileName}`) 
                        )
                );

            await interaction.editReply({ 
                flags: [MessageFlags.IsComponentsV2],
                files: files,
                components: [mainContainer]
            });

        } catch (error) {
            console.error("Test Command Error:", error);
            await interaction.editReply({ content: "❌ **Error:** Something went wrong generating the test welcome. Check the console!" });
        }
    }
};
