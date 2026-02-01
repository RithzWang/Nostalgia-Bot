const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    // V2 Imports
    ContainerBuilder, 
    TextDisplayBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('replace')
        .setDescription('Manage message types')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- SUBCOMMAND 1: TO CONTAINER ---
        .addSubcommand(sub => 
            sub.setName('to_container')
                .setDescription('Replace a normal message with a V2 Container')
                .addStringOption(option => 
                    option.setName('message_id')
                        .setDescription('The ID of the message to edit')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where the message is')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        )

        // --- SUBCOMMAND 2: TO MESSAGE ---
        .addSubcommand(sub => 
            sub.setName('to_message')
                .setDescription('Revert a Container back to a normal text message')
                .addStringOption(option => 
                    option.setName('message_id')
                        .setDescription('The ID of the container message to edit')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('content')
                        .setDescription('The new text content for the message')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where the message is')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const messageId = interaction.options.getString('message_id');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            const targetMessage = await channel.messages.fetch(messageId);

            if (targetMessage.author.id !== interaction.client.user.id) {
                return interaction.editReply({ content: '<:no:1297814819105144862> I can only edit my own messages.' });
            }

            // ====================================================
            // LOGIC SPLIT
            // ====================================================

            if (subcommand === 'to_container') {
                // --- PHASE 1: LOADING (Only for Container) ---
                const loadingText = new TextDisplayBuilder()
                    .setContent('### 🔄 Updating...\nProcessing changes...');

                const loadingContainer = new ContainerBuilder()
                    .setAccentColor(0xFEE75C) // Yellow
                    .addTextDisplayComponents(loadingText);

                await targetMessage.edit({
                    content: '',             
                    embeds: [],
                    files: [], // Clear attachments
                    components: [loadingContainer], 
                    flags: MessageFlags.IsComponentsV2
                });

                await new Promise(resolve => setTimeout(resolve, 3000));

                // --- PHASE 2: FINAL CONTAINER ---
                const titleText = new TextDisplayBuilder().setContent('# ✨ Replacement Complete');
                const separator = new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small);
                const bodyText = new TextDisplayBuilder().setContent('This message has been successfully replaced with a new **V2 Container** structure.');

                const btnRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('dummy_button')
                        .setLabel('It worked!')
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true)
                );

                const finalContainer = new ContainerBuilder()
                    .setAccentColor(0x57F287) // Green
                    .addTextDisplayComponents(titleText)
                    .addSeparatorComponents(separator)
                    .addTextDisplayComponents(bodyText)
                    .addActionRowComponents(btnRow); 

                await targetMessage.edit({
                    components: [finalContainer],
                    flags: MessageFlags.IsComponentsV2
                });

                return interaction.editReply({ content: `<:yes:1297814648417943565> Message replaced with **Container**!` });
            } 
            
            else if (subcommand === 'to_message') {
                // --- DIRECT REVERT (No Loading Animation) ---
                // We skip the loading animation here because flipping 
                // Container -> Container -> Text often causes API errors.
                
                const newContent = interaction.options.getString('content');

                await targetMessage.edit({
                    content: newContent,
                    components: [], // Clear components
                    embeds: [],     // Clear embeds
                    files: [],      // Clear attachments
                    flags: 0        // 0 Removes "IsComponentsV2" flag
                });

                return interaction.editReply({ content: `<:yes:1297814648417943565> Container reverted to **Normal Message**!` });
            }

        } catch (error) {
            console.error(error);
            const errorMsg = `<:no:1297814819105144862> Error: ${error.message}`;
            return interaction.editReply({ content: errorMsg });
        }
    }
};
