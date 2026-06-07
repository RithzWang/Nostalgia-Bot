const NetworkConfig = require('../src/models/NetworkConfig');

async function enforceNetworkRules(client) {
    const configs = await NetworkConfig.find();
    
    // Process networks grouped by their Main Hub ID to support MULTIPLE different admin networks
    const hubs = configs.filter(c => c.isMainServer === true);

    for (const hubConfig of hubs) {
        const mainGuild = client.guilds.cache.get(hubConfig.guildId);
        if (!mainGuild) continue;

        try { await mainGuild.members.fetch(); } catch (e) {}
        const mainMemberIds = new Set(mainGuild.members.cache.keys());

        // Find all satellites linked to THIS specific hub
        const satellites = configs.filter(c => !c.isMainServer && c.mainServerId === hubConfig.guildId);

        for (const config of satellites) {
            const satelliteGuild = client.guilds.cache.get(config.guildId);
            if (!satelliteGuild) continue;

            try { await satelliteGuild.members.fetch(); } catch (e) {}

            for (const [memberId, member] of satelliteGuild.members.cache) {
                if (member.user.bot) continue;

                // Rule A: Enforce Gatekeeper Purge
                if (config.kickIfNoMain && !mainMemberIds.has(memberId)) {
                    await member.send({
                        content: `⚠️ You were removed from **${satelliteGuild.name}** because you are no longer in our Main Hub server.`
                    }).catch(() => {});
                    await member.kick('Network Grid Purge: Left Main Hub.').catch(() => {});
                    continue; 
                }

                // Rule B: Global Tag Role Synchronization
                if (config.globalTagRoleId) {
                    const mainMember = mainGuild.members.cache.get(memberId);
                    const mainTagRole = hubConfig.globalTagRoleId;

                    if (mainMember && mainTagRole) {
                        const hasTagInMain = mainMember.roles.cache.has(mainTagRole);
                        const hasTagInSatellite = member.roles.cache.has(config.globalTagRoleId);

                        if (hasTagInMain && !hasTagInSatellite) {
                            await member.roles.add(config.globalTagRoleId).catch(() => {});
                        } 
                        else if (!hasTagInMain && hasTagInSatellite) {
                            await member.roles.remove(config.globalTagRoleId).catch(() => {});
                        }
                    }
                }
            }
        }
    }
}

module.exports = { enforceNetworkRules };
