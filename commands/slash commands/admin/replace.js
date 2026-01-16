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
        
        // --- SUBCOMMAND 1: TO CONTAINER (Original) ---
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

        // --- SUBCOMMAND 2: TO MESSAGE (New) ---
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
        // 1. ENABLE EPHEMERAL MODE
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const messageId = interaction.options.getString('message_id');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // 2. Fetch Target Message
            const targetMessage = await channel.messages.fetch(messageId);

            // Validation
            if (targetMessage.author.id !== interaction.client.user.id) {
                return interaction.editReply({ content: '<:no:1297814819105144862> I can only edit my own messages.' });
            }

            // ====================================================
            // COMMON: SHOW LOADING STATE (Yellow Container)
            // ====================================================
            // We use the V2 Container loading state for BOTH transitions
            // so it looks professional before switching.
            
            const loadingText = new TextDisplayBuilder()
                .setContent('### 🔄 Updating...\nProcessing changes...');

            const loadingContainer = new ContainerBuilder()
                .setAccentColor(0xFEE75C) // Yellow "Warning"
                .addTextDisplayComponents(loadingText);

            await targetMessage.edit({
                content: '',             
                embeds: [],              
                components: [loadingContainer], 
                flags: MessageFlags.IsComponentsV2
            });

            // Wait 3 Seconds for effect
            await new Promise(resolve => setTimeout(resolve, 3000));

            // ====================================================
            // LOGIC SPLIT
            // ====================================================

            if (subcommand === 'to_container') {
                // --- PHASE 2: REPLACE WITH V2 CONTAINER ---
                
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
                    .setAccentColor(0x57F287) // Green "Success"
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
                // --- PHASE 2: REVERT TO NORMAL TEXT ---
                
                const newContent = interaction.options.getString('content');

                await targetMessage.edit({
                    content: newContent,
                    components: [], // Remove all buttons/containers
                    embeds: [],     // Remove embeds
                    flags: 0        // IMPORTANT: Reset flags to 0 to remove "IsComponentsV2"
                });

                return interaction.editReply({ content: `<:yes:1297814648417943565> Container reverted to **Normal Message**!` });
            }

        } catch (error) {
            console.error(error);
            const errorMsg = '<:no:1297814819105144862> Could not find that message or I do not have permission to edit it.';
            return interaction.editReply({ content: errorMsg });
        }
    }
};
