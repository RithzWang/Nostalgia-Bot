const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 GATEKEEPER CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const MAIN_SERVER_INVITE = 'https://discord.gg/3pJPe9QUcs'; // ⚠️ REPLACE THIS

// ⏳ MEMORY (Stores who is currently being warned)
const pendingKicks = new Map();

async function runGatekeeper(client) {
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Gatekeeper] ❌ Bot is not in the Main Server!');

    // 1. Force Fetch Main Server Members
    try { 
        await mainGuild.members.fetch(); 
    } catch (e) {
        // 👇 THIS IS THE UPDATE: It prints the REAL error code now
        console.error('[Gatekeeper] 🛑 CRITICAL FETCH ERROR:', e);
        return;
    }

    const trackedServers = await TrackedServer.find();

    for (const serverData of trackedServers) {
        // Skip checking the Main Server itself
        if (serverData.guildId === MAIN_GUILD_ID) continue;

        const satelliteGuild = client.guilds.cache.get(serverData.guildId);
        if (!satelliteGuild) continue;

        try {
            // Fetch members of this satellite server
            await satelliteGuild.members.fetch();

            for (const [memberId, member] of satelliteGuild.members.cache) {
                if (member.user.bot) continue;           // Ignore Bots
                if (memberId === satelliteGuild.ownerId) continue; // Ignore Server Owner

                // CHECK: Is this user present in the Main Hub?
                const isInMain = mainGuild.members.cache.has(memberId);
                const kickKey = `${serverData.guildId}-${memberId}`;

                if (isInMain) {
                    // ✅ User is safe. If they had a pending kick timer, cancel it.
                    if (pendingKicks.has(kickKey)) {
                        pendingKicks.delete(kickKey);
                        console.log(`[Gatekeeper] ${member.user.tag} rejoined Main Server. Timer cancelled.`);
                    }
                } else {
                    // ❌ User is NOT in Main Server.
                    if (!pendingKicks.has(kickKey)) {
                        // A. FIRST DETECTION: Start Timer & Send Warning
                        pendingKicks.set(kickKey, Date.now());
                        
                        console.log(`[Gatekeeper] ⚠️ Warning ${member.user.tag} in ${satelliteGuild.name}`);
                        
                        try {
                            await member.send(
                                `⚠️ **Security Check: ${satelliteGuild.name}**\n` +
                                `You must be a member of our Main Hub Server to stay in our satellite servers.\n\n` +
                                `⏱️ **You have 20 MINUTES to join (or rejoin), or you will be kicked.**\n` +
                                `🔗 **Join Here:** ${MAIN_SERVER_INVITE}`
                            );
                        } catch (e) {
                            // Can't DM user (DMs closed), but timer still starts.
                        }

                    } else {
                        // B. ALREADY DETECTED: Check Timer
                        const startTime = pendingKicks.get(kickKey);
                        const timeDiff = Date.now() - startTime;
                        const TWENTY_MINUTES = 20 * 60 * 1000;

                        if (timeDiff > TWENTY_MINUTES) {
                            // 💀 TIME UP: Kick the user
                            try {
                                await member.kick("Gatekeeper: Left Main Hub Server and did not return in 20m.");
                                console.log(`[Gatekeeper] 🥾 KICKED ${member.user.tag} from ${satelliteGuild.name}`);
                                pendingKicks.delete(kickKey); // Cleanup
                            } catch (e) {
                                console.log(`[Gatekeeper] Failed to kick ${member.user.tag} (Missing Permissions?): ${e.message}`);
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
