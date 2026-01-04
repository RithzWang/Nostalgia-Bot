const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    MessageFlags,
    GuildDefaultMessageNotifications
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cloneserver')
        .setDescription('Clones the current server to a new one (Requires Bot in <10 servers)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. HARD LIMIT CHECK
        if (interaction.client.guilds.cache.size >= 10) {
            return interaction.reply({ 
                content: `❌ **Discord API Limit Reached**\nI am in ${interaction.client.guilds.cache.size} servers.\nDiscord ONLY allows bots to create new servers if they are in **less than 10 servers**.\n\n**Solution:** Use a fresh Bot Token for this specific task.`,
                flags: MessageFlags.Ephemeral
            });
        }

        await interaction.reply({ 
            content: '⏳ **Analyzing Server...** This will take a moment to avoid rate limits.', 
            flags: MessageFlags.Ephemeral 
        });

        const sourceGuild = interaction.guild;
        const roleMap = new Map(); 
        const categoryMap = new Map();

        // Delay helper to prevent "Rate Limited" bans
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        try {
            // --- 2. CREATE SERVER ---
            const newGuild = await interaction.client.guilds.create({
                name: `${sourceGuild.name} (Copy)`,
                icon: sourceGuild.iconURL({ extension: 'png' }),
                defaultMessageNotifications: GuildDefaultMessageNotifications.OnlyMentions
            });

            // Clean default channels
            newGuild.channels.cache.forEach(c => c.delete().catch(() => {}));

            // --- 3. COPY ROLES ---
            // Sort Roles: Highest position first (so we can create them in order)
            // Filter: Ignore @everyone and managed bot roles
            const rolesToCopy = sourceGuild.roles.cache
                .filter(r => !r.managed && r.name !== '@everyone')
                .sort((a, b) => a.position - b.position); // Low to High for creation

            await interaction.editReply('⏳ **Cloning Roles...**');

            for (const [oldId, role] of rolesToCopy) {
                try {
                    const newRole = await newGuild.roles.create({
                        name: role.name,
                        color: role.color,
                        permissions: role.permissions,
                        hoist: role.hoist,
                        mentionable: role.mentionable
                    });
                    roleMap.set(oldId, newRole.id);
                    await wait(800); // Wait 0.8s per role
                } catch (e) {
                    console.log(`Role Skip: ${role.name}`);
                }
            }
            // Map @everyone manually
            roleMap.set(sourceGuild.id, newGuild.id);

            // Helper to copy permissions
            const getOverwrites = (channel) => {
                return channel.permissionOverwrites.cache.map(overwrite => {
                    const newId = roleMap.get(overwrite.id); // Get new Role ID
                    if (!newId) return null;
                    return {
                        id: newId,
                        allow: overwrite.allow,
                        deny: overwrite.deny,
                        type: overwrite.type
                    };
                }).filter(o => o !== null);
            };

            // --- 4. COPY CATEGORIES ---
            await interaction.editReply('⏳ **Cloning Categories...**');
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
                    await wait(800);
                } catch (e) {}
            }

            // --- 5. COPY CHANNELS ---
            await interaction.editReply('⏳ **Cloning Channels...**');
            const channels = sourceGuild.channels.cache
                .filter(c => !c.parent && c.type !== ChannelType.GuildCategory) // No parent first
                .concat(sourceGuild.channels.cache.filter(c => c.parent)) // Then with parent
                .filter(c => c.type !== ChannelType.GuildCategory && c.type !== ChannelType.GuildDirectory);

            let inviteChannel = null;

            for (const [oldId, channel] of channels) {
                try {
                    const newParent = channel.parentId ? categoryMap.get(channel.parentId) : null;
                    
                    const newChannel = await newGuild.channels.create({
                        name: channel.name,
                        type: channel.type,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        parent: newParent,
                        permissionOverwrites: getOverwrites(channel)
                    });

                    if (!inviteChannel && channel.type === ChannelType.GuildText) inviteChannel = newChannel;
                    await wait(1000); // 1s per channel
                } catch (e) {
                    console.log(`Channel Skip: ${channel.name}`);
                }
            }

            // --- 6. INVITE & TRANSFER ---
            if (!inviteChannel) {
                inviteChannel = await newGuild.channels.create({ name: 'general', type: ChannelType.GuildText });
            }
            
            const invite = await inviteChannel.createInvite({ maxUses: 1 });

            // Listener for ownership transfer
            const joinListener = async (member) => {
                if (member.guild.id === newGuild.id && member.id === interaction.user.id) {
                    try {
                        await newGuild.setOwner(member);
                        await inviteChannel.send(`👑 **Server Transferred to <@${member.id}>!**\nDon't forget to check your Role settings if your Crown is missing.`);
                        interaction.client.off('guildMemberAdd', joinListener);
                    } catch (e) {
                        inviteChannel.send('❌ Failed to transfer ownership. Please ask me to leave so you can claim it.');
                    }
                }
            };
            interaction.client.on('guildMemberAdd', joinListener);

            await interaction.editReply({ 
                content: `✅ **Cloning Complete!**\n\n**Join here to claim ownership:**\n${invite.url}` 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply(`❌ **Failed:** ${error.message}`);
        }
    }
};
