const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags, 
    ChannelType,
    // V2 Imports
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('registration')
        .setDescription('Manage the registration system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- ENABLE COMMAND ---
        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Create or Enable the Registration Dashboard')
                .addStringOption(opt => opt.setName('message_id').setDescription('Edit an existing message ID'))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post in').addChannelTypes(ChannelType.GuildText))
        )
        
        // --- DISABLE COMMAND ---
        .addSubcommand(sub => 
            sub.setName('disable')
                .setDescription('Disable the Register button (close registration)')
                .addStringOption(opt => opt.setName('message_id').setDescription('The message ID to disable').setRequired(true))
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel where the message is'))
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const sub = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const messageId = interaction.options.getString('message_id');

        // IDs (Update these if needed)
        const registeredRoleId = '1456197055117787136'; 

        // Calculate Total Registered Members
        const role = interaction.guild.roles.cache.get(registeredRoleId);
        const totalRegistered = role ? role.members.size : 'N/A';

        // --- BUILD COMPONENTS ---
        // 1. Text Content
        const headerText = new TextDisplayBuilder()
            .setContent('### <:registration:1447143542643490848> Registration');
        
        const descText = new TextDisplayBuilder()
            .setContent(`To access chat and connect to voice channels, please register below.\n\n**Note:**\n\`Name\` : followed by your desired name.\n\`Country\` : followed by your country’s flag emoji.`);

        // 2. Buttons
        const registerBtn = new ButtonBuilder()
            .setCustomId('reg_btn_open')
            .setLabel('Register')
            .setStyle(ButtonStyle.Success) // Green
            .setDisabled(sub === 'disable'); // Disable if command is /disable

        const countBtn = new ButtonBuilder()
            .setCustomId('reg_btn_stats')
            .setLabel(`Total Registered: ${totalRegistered}`)
            .setStyle(ButtonStyle.Secondary) // Grey
            .setDisabled(true);

        const btnRow = new ActionRowBuilder().addComponents(registerBtn, countBtn);

        // 3. Assemble V2 Container
        const container = new ContainerBuilder()
            .setAccentColor(sub === 'disable' ? 0x808080 : 0x57F287) // Red if disabled, Green if enabled
            .addTextDisplayComponents(headerText)
            .addTextDisplayComponents(descText)
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
            .addActionRowComponents(btnRow); // Buttons INSIDE container

        const payload = { 
            content: '', 
            components: [container], 
            flags: MessageFlags.IsComponentsV2 
        };

        try {
            if (messageId) {
                // Edit Existing Message
                const message = await targetChannel.messages.fetch(messageId);
                if (!message) return interaction.editReply({ content: '<:no:1297814819105144862> Message not found.' });

                await message.edit(payload);
                return interaction.editReply({ content: `<:yes:1297814648417943565> Registration dashboard **${sub}d** successfully.` });
            } else {
                if (sub === 'disable') return interaction.editReply({ content: '<:no:1297814819105144862> You must provide a `message_id` to disable specific panels.' });
                
                // Send New Message
                await targetChannel.send(payload);
                return interaction.editReply({ content: `<:yes:1297814648417943565> Registration dashboard created in ${targetChannel}!` });
            }
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '<:no:1297814819105144862> Failed to update/send message. Check permissions.' });
        }
    }
};
