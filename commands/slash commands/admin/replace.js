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
        .setDescription('Reset a message and replace it with a Container')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The ID of the message to edit')
                .setRequired(true)
        )
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel where the message is (defaults to current)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
        ),

    async execute(interaction) {
        // 1. ENABLE EPHEMERAL MODE (Hidden)
        // This makes all future .editReply calls hidden automatically.
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const messageId = interaction.options.getString('message_id');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // 2. Fetch the Target Message
            const targetMessage = await channel.messages.fetch(messageId);

            // Validation Error (Hidden)
            if (targetMessage.author.id !== interaction.client.user.id) {
                return interaction.editReply({ content: '<:no:1297814819105144862> I can only edit my own messages.' });
            }

            // ====================================================
            // PHASE 1: RESET / UPDATING STATE
            // ====================================================
            
            const loadingText = new TextDisplayBuilder()
                .setContent('### 🔄 Updating...\nRemoving old components...');

            const loadingContainer = new ContainerBuilder()
                .setAccentColor(0xFEE75C) // Yellow "Warning"
                .addTextDisplayComponents(loadingText);

            // Remove old buttons/menus, show loading
            await targetMessage.edit({
                content: '',             
                embeds: [],              
                components: [loadingContainer], 
                flags: MessageFlags.IsComponentsV2
            });

            // Wait 3 Seconds
            await new Promise(resolve => setTimeout(resolve, 3000));

            // ====================================================
            // PHASE 2: NEW CONTAINER REPLACEMENT
            // ====================================================
            
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

            // Final Edit
            await targetMessage.edit({
                components: [finalContainer],
                flags: MessageFlags.IsComponentsV2
            });

            // Success Reply (Hidden)
            return interaction.editReply({ content: `<:yes:1297814648417943565> Message ${messageId} has been replaced!` });

        } catch (error) {
            console.error(error);
            
            // ERROR HANDLING (Guaranteed Ephemeral)
            const errorMsg = '<:no:1297814819105144862> Could not find that message or I do not have permission to edit it.';
            
            if (interaction.deferred || interaction.replied) {
                // If we already deferred, edit the hidden reply
                return interaction.editReply({ content: errorMsg });
            } else {
                // If we crashed BEFORE deferring, force a hidden reply
                return interaction.reply({ content: errorMsg, flags: MessageFlags.Ephemeral });
            }
        }
    }
};
