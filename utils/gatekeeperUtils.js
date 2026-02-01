const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, 
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 GATEKEEPER CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const LOG_CHANNEL_ID = '1456197056988319869'; // Where to log kicks (in Main Server)

const pendingKicks = new Map();

async function runGatekeeper(client) {
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return;

    // Helper: Log kicks to Main Server Admin Channel
    const logToDiscord = async (title, content) => {
        const channel = mainGuild.channels.cache.get(LOG_CHANNEL_ID);
        if (channel) {
            const c = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
            await channel.send({ components: [c], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
        }
    };

    if (mainGuild.members.cache.size < mainGuild.memberCount) {
        try { await mainGuild.members.fetch(); } catch (e) {}
    }

    const trackedServers = await TrackedServer.find();

    for (const serverData of trackedServers) {
        if (serverData.guildId === MAIN_GUILD_ID) continue;
        
        // Only run if this server has a Welcome Channel set up
        if (!serverData.welcomeChannelId) continue;

        const satelliteGuild = client.guilds.cache.get(serverData.guildId);
        if (!satelliteGuild) continue;

        try {
            if (satelliteGuild.members.cache.size < satelliteGuild.memberCount) {
                try { await satelliteGuild.members.fetch(); } catch (e) {}
            }

            for (const [memberId, member] of satelliteGuild.members.cache) {
                if (member.user.bot) continue;           
                if (memberId === satelliteGuild.ownerId) continue; 
                if (member.premiumSince !== null) continue; // Skip Boosters

                const isInMain = mainGuild.members.cache.has(memberId);
                const kickKey = `${serverData.guildId}-${memberId}`;

                if (isInMain) {
                    // ✅ User is safe
                    if (pendingKicks.has(kickKey)) {
                        pendingKicks.delete(kickKey);
                    }
                } else {
                    // ❌ User is NOT in Main Server
                    if (!pendingKicks.has(kickKey)) {
                        // Start Timer (Silent, because welcome message already warned them)
                        pendingKicks.set(kickKey, Date.now());
                    } else {
                        // Check Timer
                        const startTime = pendingKicks.get(kickKey);
                        const timeDiff = Date.now() - startTime;
                        const TEN_MINUTES = 10 * 60 * 1000; 

                        if (timeDiff > TEN_MINUTES) {
                            try {
                                await member.kick("Gatekeeper: Did not join Main Hub within 10m.");
                                pendingKicks.delete(kickKey);
                                await logToDiscord('🥾 User Kicked', `**User:** ${member.user.tag}\n**Server:** ${satelliteGuild.name}\n**Reason:** 10m Timer Expired.`);
                            } catch (e) {
                                console.error(`[Gatekeeper] Failed to kick ${member.user.tag}: ${e.message}`);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error(`[Gatekeeper] Error checking ${satelliteGuild.name}:`, e.message);
        }
    }
}

module.exports = { runGatekeeper };
