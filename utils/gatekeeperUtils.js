const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 GATEKEEPER CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const MAIN_SERVER_INVITE = 'https://discord.gg/3pJPe9QUcs'; // ⚠️ REPLACE THIS WITH YOUR REAL LINK

// ⏳ MEMORY (Stores who is currently being warned)
const pendingKicks = new Map();

async function runGatekeeper(client) {
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Gatekeeper] ❌ Bot is not in the Main Server!');

    // 1. Force Fetch Main Server Members
    try { await mainGuild.members.fetch(); } catch (e) {
        console.log('[Gatekeeper] Failed to fetch main guild members');
        return;
    }

    const trackedServers = await TrackedServer.find();

    for (const serverData of trackedServers) {
        if (serverData.guildId === MAIN_GUILD_ID) continue;

        const satelliteGuild = client.guilds.cache.get(serverData.guildId);
        if (!satelliteGuild) continue;

        try {
            await satelliteGuild.members.fetch();

            for (const [memberId, member] of satelliteGuild.members.cache) {
                if (member.user.bot) continue;
                if (memberId === satelliteGuild.ownerId) continue;

                const isInMain = mainGuild.members.cache.has(memberId);
                const kickKey = `${serverData.guildId}-${memberId}`;

                if (isInMain) {
                    if (pendingKicks.has(kickKey)) {
                        pendingKicks.delete(kickKey);
                        console.log(`[Gatekeeper] ${member.user.tag} rejoined Main Server. Timer cancelled.`);
                    }
                } else {
                    if (!pendingKicks.has(kickKey)) {
                        pendingKicks.set(kickKey, Date.now());
                        console.log(`[Gatekeeper] ⚠️ Warning ${member.user.tag} in ${satelliteGuild.name}`);
                        
                        try {
                            await member.send(
                                `⚠️ **Security Check: ${satelliteGuild.name}**\n` +
                                `You must be a member of our Main Hub Server to stay in our satellite servers.\n\n` +
                                `⏱️ **You have 20 MINUTES to join (or rejoin), or you will be kicked.**\n` +
                                `🔗 **Join Here:** ${MAIN_SERVER_INVITE}`
                            );
                        } catch (e) {} 
                    } else {
                        const startTime = pendingKicks.get(kickKey);
                        const timeDiff = Date.now() - startTime;
                        const TWENTY_MINUTES = 20 * 60 * 1000; // 20 Minutes

                        if (timeDiff > TWENTY_MINUTES) {
                            try {
                                await member.kick("Gatekeeper: Left Main Hub Server and did not return in 20m.");
                                console.log(`[Gatekeeper] 🥾 KICKED ${member.user.tag} from ${satelliteGuild.name}`);
                                pendingKicks.delete(kickKey);
                            } catch (e) {
                                console.log(`[Gatekeeper] Failed to kick ${member.user.tag}: ${e.message}`);
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
