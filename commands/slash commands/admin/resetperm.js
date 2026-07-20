const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// Dynamically build the command to avoid massive boilerplate
const commandData = new SlashCommandBuilder()
    .setName('reset-perm')
    .setDescription('Reset permissions for roles or channels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator); // Restricted to Admins to prevent abuse

// 1. Subcommand: role
commandData.addSubcommand(subcommand => {
    subcommand
        .setName('role')
        .setDescription('Turn off all permissions for up to 20 specific roles');
    
    for (let i = 1; i <= 20; i++) {
        subcommand.addRoleOption(option =>
            option.setName(`role${i}`)
                .setDescription(`Role ${i} to reset`)
                .setRequired(i === 1) // Only role1 is required
        );
    }
    return subcommand;
});

// 2. Subcommand: roleall
commandData.addSubcommand(subcommand =>
    subcommand
        .setName('roleall')
        .setDescription('Turn off all permissions for ALL roles in the server')
);

// 3. Subcommand: channel
commandData.addSubcommand(subcommand => {
    subcommand
        .setName('channel')
        .setDescription('Remove all role overwrites for up to 20 specific channels');
    
    for (let i = 1; i <= 20; i++) {
        subcommand.addChannelOption(option =>
            option.setName(`channel${i}`)
                .setDescription(`Channel ${i} to reset`)
                .setRequired(i === 1) // Only channel1 is required
        );
    }
    return subcommand;
});

// 4. Subcommand: channelall
commandData.addSubcommand(subcommand =>
    subcommand
        .setName('channelall')
        .setDescription('Remove all role overwrites for ALL channels in the server')
);

module.exports = {
    data: commandData,

    async execute(interaction) {
        // Deferring the reply is CRITICAL here. Editing up to 20 roles/channels (or all of them) 
        // will take longer than Discord's 3-second interaction limit.
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === 'role') {
                let resetCount = 0;
                
                for (let i = 1; i <= 20; i++) {
                    const role = interaction.options.getRole(`role${i}`);
                    if (role) {
                        // Check if the bot has hierarchy permission to edit this role
                        if (role.position < interaction.guild.members.me.roles.highest.position && !role.managed) {
                            await role.setPermissions(0n); // 0n BigInt turns off all perms
                            resetCount++;
                        }
                    }
                }
                await interaction.editReply(`✅ Successfully reset permissions for **${resetCount}** role(s).`);
            } 
            
            else if (subcommand === 'roleall') {
                const roles = interaction.guild.roles.cache;
                let resetCount = 0;

                // Loop through all roles and reset, avoiding bot integrations and roles higher than the bot
                for (const [id, role] of roles) {
                    if (role.position < interaction.guild.members.me.roles.highest.position && !role.managed) {
                        await role.setPermissions(0n);
                        resetCount++;
                    }
                }
                await interaction.editReply(`✅ Successfully reset permissions for **${resetCount}** role(s) across the server.`);
            } 
            
            else if (subcommand === 'channel') {
                let resetCount = 0;
                
                for (let i = 1; i <= 20; i++) {
                    const channel = interaction.options.getChannel(`channel${i}`);
                    if (channel) {
                        // Setting overwrites to an empty array removes all custom role/member permissions
                        await channel.permissionOverwrites.set([]);
                        resetCount++;
                    }
                }
                await interaction.editReply(`✅ Successfully removed all permission overwrites for **${resetCount}** channel(s).`);
            } 
            
            else if (subcommand === 'channelall') {
                const channels = interaction.guild.channels.cache;
                let resetCount = 0;

                for (const [id, channel] of channels) {
                    // Make sure it's a text/voice/category channel that accepts overwrites
                    if (channel.permissionOverwrites) {
                        await channel.permissionOverwrites.set([]);
                        resetCount++;
                    }
                }
                await interaction.editReply(`✅ Successfully removed all permission overwrites for **${resetCount}** channel(s) across the server.`);
            }

        } catch (error) {
            console.error('Error in reset-perm command:', error);
            await interaction.editReply('⚠️ An error occurred while trying to execute this command. Check the console for details. (Make sure my bot role is placed high enough in the server settings!).');
        }
    },
};
