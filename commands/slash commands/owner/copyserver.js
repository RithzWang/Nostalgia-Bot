const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('replicate')
        .setDescription('Wipes THIS server and copies everything from a Source Server ID.')
        .addStringOption(option => 
            option.setName('source_id')
                .setDescription('The ID of the server you want to copy FROM')
                .setRequired(true)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const sourceId = interaction.options.getString('source_id');
        const targetGuild = interaction.guild; // The server command is running IN (The new one)
        const sourceGuild = interaction.client.guilds.cache.get(sourceId); // The server copying FROM

        // --- 1. CHECKS ---
        if (!sourceGuild) {
            return interaction.reply({ 
                content: `❌ **I cannot find the source server.**\nMake sure I am in the server with ID \`${sourceId}\`.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        if (targetGuild.id === sourceGuild.id) {
            return interaction.reply({ content: '❌ You cannot replicate a server onto itself!', flags: MessageFlags.Ephemeral });
        }

        // Confirmation Button (Safety)
        await interaction.reply({ 
            content: `⚠️ **WARNING: DESTRUCTIVE ACTION**\nI am about to **DELETE ALL CHANNELS AND ROLES** in **${targetGuild.name}** and replace them with data from **${sourceGuild.name}**.\n\nAre you sure?`,
            flags: MessageFlags.Ephemeral
        });

        // (For simplicity in this code, we proceed immediately after a 3s delay. 
        // In a polished bot, you'd add a "Confirm" button here.)
        const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        await wait(3000); 
        await interaction.editReply('⏳ **Starting Replication...** (This may take 1-2 minutes)');

        const roleMap = new Map(); // OldRoleID -> NewRoleID
        const categoryMap = new Map();

        try {
            // --- 2. CLEANUP TARGET SERVER ---
            // Delete all channels
            const channelsToDelete = targetGuild.channels.cache.filter(c => c.deletable);
            for (const [id, channel] of channelsToDelete) {
                await channel.delete().catch(() => {});
            }

            // Delete all roles (except managed/everyone)
            const rolesToDelete = targetGuild.roles.cache.filter(r => !r.managed && r.name !== '@everyone' && r.editable);
            for (const [id, role] of rolesToDelete) {
                await role.delete().catch(() => {});
            }

            // --- 3. COPY ROLES ---
            const rolesToCopy = sourceGuild.roles.cache
                .filter(r => !r.managed && r.name !== '@everyone')
                .sort((a, b) => a.position - b.position); // Low to High

            for (const [oldId, role] of rolesToCopy) {
                try {
                    const newRole = await targetGuild.roles.create({
                        name: role.name,
                        color: role.color,
                        permissions: role.permissions,
                        hoist: role.hoist,
                        mentionable: role.mentionable,
                        reason: 'Server Replication'
                    });
                    roleMap.set(oldId, newRole.id);
                    await wait(800); // Rate Limit Safety
                } catch (e) {
                    console.log(`Failed role: ${role.name}`);
                }
            }
            roleMap.set(sourceGuild.id, targetGuild.id); // Map @everyone

            // Helper for Overwrites
            const getOverwrites = (channel) => {
                return channel.permissionOverwrites.cache.map(overwrite => {
                    const newId = roleMap.get(overwrite.id);
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
            const categories = sourceGuild.channels.cache
                .filter(c => c.type === ChannelType.GuildCategory)
                .sort((a, b) => a.position - b.position);

            for (const [oldId, cat] of categories) {
                try {
                    const newCat = await targetGuild.channels.create({
                        name: cat.name,
                        type: ChannelType.GuildCategory,
                        permissionOverwrites: getOverwrites(cat)
                    });
                    categoryMap.set(oldId, newCat.id);
                    await wait(800);
                } catch (e) {}
            }

            // --- 5. COPY CHANNELS ---
            const channels = sourceGuild.channels.cache
                .filter(c => c.type !== ChannelType.GuildCategory && c.type !== ChannelType.GuildDirectory)
                .sort((a, b) => a.position - b.position);

            let firstChannel = null;

            for (const [oldId, channel] of channels) {
                try {
                    const newParent = channel.parentId ? categoryMap.get(channel.parentId) : null;
                    
                    const newChannel = await targetGuild.channels.create({
                        name: channel.name,
                        type: channel.type,
                        parent: newParent,
                        topic: channel.topic,
                        nsfw: channel.nsfw,
                        permissionOverwrites: getOverwrites(channel)
                    });

                    if (!firstChannel && channel.type === ChannelType.GuildText) firstChannel = newChannel;
                    await wait(1000);
                } catch (e) {
                    console.log(`Failed channel: ${channel.name}`);
                }
            }

            // --- 6. FINISH ---
            if (firstChannel) {
                await firstChannel.send(`✅ **Replication Complete!**\nServer has been synced with **${sourceGuild.name}**.`);
            }

        } catch (error) {
            console.error(error);
            // Since we deleted the channel we were talking in, we can't really reply here.
            // But we log it to console.
        }
    }
};
