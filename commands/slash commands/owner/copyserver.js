const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    MessageFlags,
    GuildDefaultMessageNotifications
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('copyserver')
        .setDescription('Clones the current server (Roles, Categories, Channels) to a new one.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        // --- 1. PRE-CHECKS ---
        if (interaction.client.guilds.cache.size >= 10) {
            return interaction.reply({ 
                content: `❌ **Bot Limitation:** I cannot create a new server because I am already in **${interaction.client.guilds.cache.size}/10** servers.\nDiscord creates this limit to prevent spam.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.reply({ 
            content: '⏳ **Starting Clone Process...**\nThis will take time to avoid Rate Limits. Please wait.', 
            flags: MessageFlags.Ephemeral 
        });

        const sourceGuild = interaction.guild;
        const roleMap = new Map(); // Maps OldRoleID -> NewRoleID
        const categoryMap = new Map(); // Maps OldCategoryID -> NewCategoryID

        // Helper for delay to prevent API bans
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            // --- 2. CREATE NEW GUILD ---
            const newGuild = await interaction.client.guilds.create({
                name: `${sourceGuild.name} (Copy)`,
                icon: sourceGuild.iconURL({ extension: 'png' }),
                defaultMessageNotifications: GuildDefaultMessageNotifications.OnlyMentions
            });

            // Cleanup: Delete the default channels/roles created by Discord
            newGuild.channels.cache.forEach(c => c.delete().catch(() => {}));

            // --- 3. COPY ROLES ---
            // We fetch roles, sort them (lowest to highest needed for creation logic), and filter out "managed" (bot) roles
            const rolesToCopy = sourceGuild.roles.cache
                .filter(r => !r.managed && r.name !== '@everyone')
                .sort((a, b) => b.position - a.position); // High to low

            for (const [oldId, role] of rolesToCopy) {
                try {
                    const newRole = await newGuild.roles.create({
                        name: role.name,
                        color: role.color,
                        permissions: role.permissions,
                        hoist: role.hoist,
                        mentionable: role.mentionable,
                        reason: 'Server Clone'
                    });
                    roleMap.set(oldId, newRole.id); // Save the link between old and new
                    await wait(1000); // Safety delay
                } catch (e) {
                    console.log(`Failed to copy role ${role.name}:`, e.message);
                }
            }

            // Maps special @everyone ID
            roleMap.set(sourceGuild.id, newGuild.id); 

            // Function to calculate permission overwrites using the Map
            const getOverwrites = (channel) => {
                return channel.permissionOverwrites.cache.map(overwrite => {
                    const newRoleId = roleMap.get(overwrite.id);
                    if (!newRoleId) return null; // Skip if it was a user specific permission or deleted role
                    return {
                        id: newRoleId,
                        allow: overwrite.allow,
                        deny: overwrite.deny,
                        type: overwrite.type
                    };
                }).filter(o => o !== null);
            };

            // --- 4. COPY CATEGORIES ---
            const categories = sourceGuild.channels.cache
                .filter(c => c.type === ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position);

            for (const [oldId, cat] of categories) {
                try {
                    const newCat = await newGuild.channels.create({
                        name: cat.name,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: getOverwrites(cat)
                    });
                    categoryMap.set(oldId, newCat.id);
                    await wait(1000);
                } catch (e) {}
            }

            // --- 5. COPY CHANNELS ---
            const channels = sourceGuild.channels.cache
                .filter(c => c.type !== ChannelType.GuildCategory && c.type !== ChannelType.GuildDirectory)
                .sort((a, b) => a.position - b.position);

            let inviteChannel = null;

            for (const [oldId, channel] of channels) {
                try {
                    // Find the new parent ID from our map
                    const newParentId = channel.parentId ? categoryMap.get(channel.parentId) : null;

                    const newChannel = await newGuild.channels.create({
                        name: channel.name,
                        type: channel.type,
                        parent: newParentId,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        rateLimitPerUser: channel.rateLimitPerUser,
                        permissionOverwrites: getOverwrites(channel)
                    });

                    // Save a text channel to create the invite later
                    if (!inviteChannel && channel.type === ChannelType.GuildText) {
                        inviteChannel = newChannel;
                    }

                    await wait(1000);
                } catch (e) {
                    console.log(`Skipped channel ${channel.name}: ${e.message}`);
                }
            }

            // Fallback if no text channel was copied
            if (!inviteChannel) {
                inviteChannel = await newGuild.channels.create({ name: 'general', type: ChannelType.GuildText });
            }

            // --- 6. INVITE & TRANSFER ---
            const invite = await inviteChannel.createInvite({ maxUses: 1, maxAge: 0 });

            await interaction.editReply({ 
                content: `✅ **Cloning Complete!**\n\n1. **New Server:** ${newGuild.name}\n2. **Join Here:** ${invite.url}\n3. **Warning:** I will transfer ownership to you as soon as you join.`
            });

            // Listen for join
            const listener = async (member) => {
                if (member.guild.id === newGuild.id && member.id === interaction.user.id) {
                    try {
                        await newGuild.setOwner(member);
                        await inviteChannel.send(`👑 **Server Transferred!**\nAll roles and channels have been copied.\n*Note: Emojis, messages, and bots cannot be copied.*`);
                        interaction.client.off('guildMemberAdd', listener);
                    } catch (err) {
                        await inviteChannel.send(`⚠️ I tried to transfer ownership but failed: ${err.message}`);
                    }
                }
            };

            interaction.client.on('guildMemberAdd', listener);
            
            // Timeout listener after 5 mins
            setTimeout(() => interaction.client.off('guildMemberAdd', listener), 300000);

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ **Process Failed:** ${error.message}` });
        }
    }
};
