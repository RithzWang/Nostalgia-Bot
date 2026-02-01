const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, 
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 GATEKEEPER CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const LOG_CHANNEL_ID = '1456197056988319869'; 
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; 

// ⏳ MEMORY
const pendingKicks = new Map();

async function runGatekeeper(client) {
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Gatekeeper] ❌ Bot is not in the Main Server!');

    // 🎨 Log Helper
    const logToDiscord = async (title, content) => {
        const channel = mainGuild.channels.cache.get(LOG_CHANNEL_ID);
        if (!channel) return;

        const container = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));

        await channel.send({ 
            components: [container], 
            flags: [MessageFlags.IsComponentsV2] 
        }).catch(() => {});
    };

    // SMART FETCH
    if (mainGuild.members.cache.size < mainGuild.memberCount) {
        try { await mainGuild.members.fetch(); } catch (e) {}
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
                if (member.premiumSince !== null) continue; // Exempt Boosters

                const isInMain = mainGuild.members.cache.has(memberId);
                const kickKey = `${serverData.guildId}-${memberId}`;

                if (isInMain) {
                    // ✅ User is safe
                    if (pendingKicks.has(kickKey)) {
                        pendingKicks.delete(kickKey);
                        // Removed console.log here
                        
                        await logToDiscord(
                            '✅ Timer Cancelled',
                            `**User:** ${member} (\`${member.user.tag}\`)\n` +
                            `**Status:** Rejoined Main Server.\n` +
                            `**Server:** ${satelliteGuild.name}`
                        );
                    }
                } else {
                    // ❌ User is NOT in Main Server
                    if (!pendingKicks.has(kickKey)) {
                        // A. FIRST DETECTION
                        pendingKicks.set(kickKey, Date.now());
                        // Removed console.log here

                        await logToDiscord(
                            '⚠️ Security Check Triggered',
                            `**User:** ${member} (\`${member.user.tag}\`)\n` +
                            `**Issue:** Not in Main Server.\n` +
                            `**Server:** ${satelliteGuild.name}\n` +
                            `**Action:** 10 Minute Timer Started.`
                        );
                        
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
                                // Removed console.log here
                                pendingKicks.delete(kickKey);

                                await logToDiscord(
                                    '🥾 User Kicked',
                                    `**User:** ${member.user.tag}\n` +
                                    `**Reason:** Failed to join Main Server in 10m.\n` +
                                    `**Removed From:** ${satelliteGuild.name}`
                                );

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
