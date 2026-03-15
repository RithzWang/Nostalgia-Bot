const { SlashCommandBuilder, Routes, PermissionFlagsBits } = require('discord.js');

// 1. Build the base command and restrict it to Administrators
const commandData = new SlashCommandBuilder()
    .setName('exclusive-invite')
    .setDescription('Create an invite restricted to specific users and roles.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// 2. Loop to generate user1 through user15
for (let i = 1; i <= 15; i++) {
    commandData.addUserOption(option => 
        option.setName(`user${i}`)
            .setDescription(`Select allowed user ${i}`)
            .setRequired(i === 1) // Only user1 is mandatory
    );
}

// 3. Loop to generate role1 through role5
for (let i = 1; i <= 5; i++) {
    commandData.addRoleOption(option => 
        option.setName(`role${i}`)
            .setDescription(`Select role ${i} to auto-assign`)
            .setRequired(false) // Roles are completely optional
    );
}

module.exports = {
    data: commandData,
    
    async execute(interaction) {
        // Defer the reply just in case the API takes a second to process the file
        await interaction.deferReply({ ephemeral: true });

        const allowedUserIds = [];
        const roleIds = [];

        // 4. Collect all provided Users
        for (let i = 1; i <= 15; i++) {
            const user = interaction.options.getUser(`user${i}`);
            if (user) allowedUserIds.push(user.id);
        }

        // 5. Collect all provided Roles
        for (let i = 1; i <= 5; i++) {
            const role = interaction.options.getRole(`role${i}`);
            if (role) roleIds.push(role.id);
        }

        // 6. Format the CSV string required by Discord
        const csvString = "user_id\n" + allowedUserIds.join("\n");
        const csvBuffer = Buffer.from(csvString);

        try {
            // 7. Send the REST API request to create the invite
            const invite = await interaction.client.rest.post(
                Routes.channelInvites(interaction.channelId),
                {
                    body: {
                        max_age: 86400, // Invite expires in 24 hours
                        max_uses: allowedUserIds.length,
                        // Only attach the role_ids array if roles were actually selected
                        ...(roleIds.length > 0 && { role_ids: roleIds })
                    },
                    files: [{
                        name: 'targets.csv',
                        data: csvBuffer,
                        key: 'target_users_file'
                    }]
                }
            );

            // 8. Edit the deferred reply with the final link
            await interaction.editReply({
                content: `Exclusive invite created successfully!\nLink: https://discord.gg/${invite.code}\n\nAllowed Users: ${allowedUserIds.length}\nAuto-assigned Roles: ${roleIds.length}`
            });

        } catch (error) {
            console.error('Error creating exclusive invite:', error);
            await interaction.editReply({ 
                content: 'Failed to create the exclusive invite. Ensure the bot has permission to create invites in this channel.' 
            });
        }
    },
};
