const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, 
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// 🔒 GATEKEEPER CONFIGURATION
const MAIN_GUILD_ID = '1456197054782111756'; 
const LOG_CHANNEL_ID = '1456197056988319869'; // Main Server Admin Log
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; 

const pendingKicks = new Map();

async function runGatekeeper(client) {
    const mainGuild = client.guilds.cache.get(MAIN_GUILD_ID);
    if (!mainGuild) return console.log('[Gatekeeper] ❌ Bot is not in the Main Server!');

    // 🎨 Admin Log Helper
    const logToDiscord = async (title, content) => {
        const channel = mainGuild.channels.cache.get(LOG_CHANNEL_ID);
        if (!channel) return;
        const logContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
        await channel.send({ components: [logContainer], flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
    };

    if (mainGuild.members.cache.size < mainGuild.memberCount) {
        try { await mainGuild.members.fetch(); } catch (e) {}
    }

    const trackedServers = await TrackedServer.find();

    for (const serverData of trackedServers) {
        if (serverData.guildId === MAIN_GUILD_ID) continue;

        // 🛑 SKIP IF ALERTS ARE DISABLED
        // If there is no Warn Channel set (because of /tag-hello), we do nothing.
        if (!serverData.warnChannelId) continue;

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
                        await logToDiscord('✅ Timer Cancelled', `**User:** ${member.user.tag}\n**Server:** ${satelliteGuild.name}\n**Status:** Rejoined Main Server.`);
                    }
                } else {
                    // ❌ User is NOT in Main Server
                    if (!pendingKicks.has(kickKey)) {
                        pendingKicks.set(kickKey, Date.now());

                        await logToDiscord('⚠️ Security Check Triggered', `**User:** ${member.user.tag}\n**Server:** ${satelliteGuild.name}\n**Action:** Warned in local channel.`);

                        // 🔔 PING USER IN SATELLITE WARN CHANNEL
                        const warnChannel = satelliteGuild.channels.cache.get(serverData.warnChannelId);
                        if (warnChannel) {
                            try {
                                const warningContainer = new ContainerBuilder()
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ⚠️ Security Alert`))
                                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                                        `### You are not in the Main Hub Server!\n` +
                                        `To stay in **${satelliteGuild.name}**, you must be a member of our Main Hub.\n\n` +
                                        `**⏱️ Time Remaining:** 10 Minutes`
                                    ))
                                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔗 **[Click here to Join Main Server](${MAIN_SERVER_INVITE})**`));

                                await warnChannel.send({
                                    content: `${member}`,
                                    components: [warningContainer],
                                    flags: [MessageFlags.IsComponentsV2]
                                });
                            } catch (e) {
                                console.error(`Failed to send warning in ${satelliteGuild.name}:`, e.message);
                            }
                        }

                    } else {
                        // B. CHECK TIMER
                        const startTime = pendingKicks.get(kickKey);
                        const timeDiff = Date.now() - startTime;
                        const TEN_MINUTES = 10 * 60 * 1000; 

                        if (timeDiff > TEN_MINUTES) {
                            try {
                                await member.kick("Gatekeeper: Left Main Hub Server and did not return in 10m.");
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
