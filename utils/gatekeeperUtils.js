const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 GATEKEEPER CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; // ⚠️ REPLACE THIS

// ⏳ MEMORY (Stores who is currently being warned)
const pendingKicks = new Map();

async function runGatekeeper(client) {
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Gatekeeper] ❌ Bot is not in the Main Server!');

    // SMART FETCH (Prevents Rate Limit Crash)
    if (mainGuild.members.cache.size < mainGuild.memberCount) {
        try {
            await mainGuild.members.fetch();
        } catch (e) {
            console.log(`[Gatekeeper] ⚠️ Rate limit hit. Using existing cache (${mainGuild.members.cache.size} members).`);
        }
    }

    const trackedServers = await TrackedServer.find();

    for (const serverData of trackedServers) {
        if (serverData.guildId === MAIN_GUILD_ID) continue;

        const satelliteGuild = client.guilds.cache.get(serverData.guildId);
        if (!satelliteGuild) continue;

        try {
            if (satelliteGuild.members.cache.size < satelliteGuild.memberCount) {
                try { await satelliteGuild.members.fetch(); } catch (e) {}
            }

            for (const [memberId, member] of satelliteGuild.members.cache) {
                if (member.user.bot) continue;           
                if (memberId === satelliteGuild.ownerId) continue; 

                // 🛡️ EXEMPTION: SERVER BOOSTERS
                // If they have a role named "Server Booster", we SKIP them.
                const isBooster = member.roles.cache.some(role => role.name === 'Server Booster');
                if (isBooster) continue; 

                // CHECK: Is this user present in the Main Hub?
                const isInMain = mainGuild.members.cache.has(memberId);
                const kickKey = `${serverData.guildId}-${memberId}`;

                if (isInMain) {
                    // ✅ User is safe
                    if (pendingKicks.has(kickKey)) {
                        pendingKicks.delete(kickKey);
                        console.log(`[Gatekeeper] ${member.user.tag} rejoined Main Server. Timer cancelled.`);
                    }
                } else {
                    // ❌ User is NOT in Main Server
                    if (!pendingKicks.has(kickKey)) {
                        // A. FIRST DETECTION
                        pendingKicks.set(kickKey, Date.now());
                        console.log(`[Gatekeeper] ⚠️ Warning ${member.user.tag} in ${satelliteGuild.name}`);
                        
                        try {
                            await member.send(
                                `⚠️ **Security Check: ${satelliteGuild.name}**\n` +
                                `You must be a member of our Main Hub Server to stay in our satellite servers.\n\n` +
                                `⏱️ **You have 10 MINUTES to join (or rejoin), or you will be kicked.**\n` +
                                `🔗 **Join Here:** ${MAIN_SERVER_INVITE}`
                            );
                        } catch (e) {} 
                    } else {
                        // B. CHECK TIMER
                        const startTime = pendingKicks.get(kickKey);
                        const timeDiff = Date.now() - startTime;
                        
                        const TEN_MINUTES = 10 * 60 * 1000; 

                        if (timeDiff > TEN_MINUTES) {
                            try {
                                await member.kick("Gatekeeper: Left Main Hub Server and did not return in 10m.");
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
