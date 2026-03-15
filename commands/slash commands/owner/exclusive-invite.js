const { SlashCommandBuilder, Routes, PermissionFlagsBits } = require('discord.js');

// 1. Base command
const commandData = new SlashCommandBuilder()
    .setName('exclusive-invite')
    .setDescription('Create a custom invite with optional user restrictions and auto-roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option => 
        option.setName('channel')
            .setDescription('Select the channel (Defaults to current channel)')
            .setRequired(false) // Optional
    )
    .addIntegerOption(option => 
        option.setName('expire_time')
            .setDescription('Expiration time (Defaults to 1 Day)')
            .setRequired(false) // Optional
            .addChoices(
                { name: '30 Minutes', value: 1800 },
                { name: '1 Hour', value: 3600 },
                { name: '6 Hours', value: 21600 },
                { name: '12 Hours', value: 43200 },
                { name: '1 Day', value: 86400 },
                { name: '7 Days', value: 604800 },
                { name: 'Never Expires', value: 0 }
            )
    );

// 2. User options (All Optional)
for (let i = 1; i <= 15; i++) {
    commandData.addStringOption(option => 
        option.setName(`user${i}`)
            .setDescription(`Paste User ID ${i}`)
            .setRequired(false) 
    );
}

// 3. Role options (All Optional)
for (let i = 1; i <= 5; i++) {
    commandData.addRoleOption(option => 
        option.setName(`role${i}`)
            .setDescription(`Select role ${i} to auto-assign`)
            .setRequired(false) 
    );
}

module.exports = {
    data: commandData,
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // Fallbacks: Use current channel if none selected, use 24 hours if no time selected
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const maxAge = interaction.options.getInteger('expire_time') ?? 86400; 
        
        const allowedUserIds = [];
        const roleIds = [];

        for (let i = 1; i <= 15; i++) {
            const userId = interaction.options.getString(`user${i}`);
            if (userId && /^\d+$/.test(userId)) allowedUserIds.push(userId);
        }

        for (let i = 1; i <= 5; i++) {
            const role = interaction.options.getRole(`role${i}`);
            if (role) roleIds.push(role.id);
        }

        // 4. Build the dynamic API Payload
        const apiPayload = {
            body: {
                max_age: maxAge,
                // Only limit max_uses if specific users are targeted
                ...(allowedUserIds.length > 0 && { max_uses: allowedUserIds.length }),
                // Only attach roles if roles were selected
                ...(roleIds.length > 0 && { role_ids: roleIds })
            }
        };

        // 5. Only generate and attach the CSV file IF users were actually provided
        if (allowedUserIds.length > 0) {
            const csvString = "user_id\n" + allowedUserIds.join("\n");
            apiPayload.files = [{
                name: 'targets.csv',
                data: Buffer.from(csvString),
                key: 'target_users_file'
            }];
        }

        try {
            const invite = await interaction.client.rest.post(
                Routes.channelInvites(targetChannel.id),
                apiPayload
            );

            // Let you know exactly what kind of invite was generated
            let responseMsg = `Invite created for ${targetChannel}!\nLink: https://discord.gg/${invite.code}\n`;
            if (allowedUserIds.length > 0) responseMsg += `\n🔒 Restricted to ${allowedUserIds.length} specific user(s).`;
            if (roleIds.length > 0) responseMsg += `\n🎭 Auto-assigns ${roleIds.length} role(s).`;
            if (allowedUserIds.length === 0 && roleIds.length === 0) responseMsg += `\n🌍 Standard public invite.`;

            await interaction.editReply({ content: responseMsg });

        } catch (error) {
            console.error('Error creating invite:', error);
            await interaction.editReply({ 
                content: 'Failed to create the invite. Ensure the bot has permission to create invites in that channel.' 
            });
        }
    },
};
