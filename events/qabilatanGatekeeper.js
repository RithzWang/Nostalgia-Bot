const { 
    Events, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SectionBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    MessageFlags 
} = require('discord.js');
const { ServerList } = require('../src/models/Qabilatan');

// 🔒 CONFIGURATION
const MAIN_SERVER_ID = '1456197054782111756';
const LOG_CHANNEL_ID = '1456197056988319869'; // Channel for Gatekeeper Logs
const KICK_DELAY_MS = 10 * 60 * 1000; // 10 Minutes

// 🛑 MEMORY STORAGE
const pendingKicks = new Map();

// 📝 HELPER: Send Log using Container V2
async function sendLog(client, title, description, color, user) {
    try {
        const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        if (!channel) return;

        // Create Section
        const section = new SectionBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${title}`),
                new TextDisplayBuilder().setContent(description)
            );

        // Add User Avatar if available
        if (user) {
            section.setThumbnailAccessory((thumb) => thumb.setURL(user.displayAvatarURL()));
        }

        // Build Container
        const container = new ContainerBuilder()
            .setAccentColor(color) 
            .addSectionComponents(section)
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# 🕒 <t:${Math.floor(Date.now() / 1000)}:R> • User ID: ${user ? user.id : 'N/A'}`)
            );

        await channel.send({ 
            components: [container], 
            flags: [MessageFlags.IsComponentsV2]
        });
    } catch (e) {
        console.error("Failed to send Gatekeeper log:", e);
    }
}

module.exports = {
    name: 'clientReady', 
    once: true,
    async execute(client) {
        console.log('🛡️ Qabilatan Gatekeeper Active (V2 Logging)');

        // ====================================================
        // 1. MEMBER LEFT MAIN SERVER -> START TIMERS
        // ====================================================
        client.on('guildMemberRemove', async (member) => {
            if (member.guild.id !== MAIN_SERVER_ID) return;

            const user = member.user;
            const displayName = user.globalName || user.username;
            const networkServers = await ServerList.find();

            for (const srv of networkServers) {
                try {
                    const guild = client.guilds.cache.get(srv.serverId);
                    if (!guild) continue;

                    const networkMember = await guild.members.fetch(user.id).catch(() => null);

                    if (networkMember) {
                        // EXEMPTION: Booster
                        if (networkMember.premiumSince) continue; 

                        // ⏳ LOG TIMER (Keep this log for leaving Main Server)
                        await sendLog(client, 
                            "Timer Started (Left Main)", 
                            `**User:** **${displayName}** (${user.username})\n**Server:** ${guild.name}\n**Action:** Will kick in **10** mins if they don't return.`, 
                            0xFFA500, // Orange
                            user
                        );

                        const key = `${user.id}_${srv.serverId}`;
                        
                        const timeout = setTimeout(async () => {
                            try {
                                // Final check
                                const freshNetworkMember = await guild.members.fetch(user.id).catch(() => null);
                                const mainGuild = client.guilds.cache.get(MAIN_SERVER_ID);
                                const isInMain = await mainGuild.members.fetch(user.id).catch(() => null);

                                if (freshNetworkMember && !freshNetworkMember.premiumSince && !isInMain) {
                                    await freshNetworkMember.kick('Qabilatan: User left Main Server and did not return.');
                                    
                                    // 🥾 LOG KICK
                                    await sendLog(client, 
                                        "Member Kicked", 
                                        `**User:** **${displayName}** (${user.username})\n**Server:** ${guild.name}\n**Reason:** Did not return to **A2-Q** Main Server.`, 
                                        0xFF0000, // Red
                                        user
                                    );
                                }
                                pendingKicks.delete(key);
                            } catch (e) { console.error(e); }
                        }, KICK_DELAY_MS);

                        pendingKicks.set(key, timeout);
                    }
                } catch (e) { console.error(e); }
            }
        });

        // ====================================================
        // 2. MEMBER REJOINED MAIN SERVER -> CANCEL TIMERS
        // ====================================================
        client.on('guildMemberAdd', async (member) => {
            if (member.guild.id !== MAIN_SERVER_ID) return;

            const user = member.user;
            const displayName = user.globalName || user.username;
            let cancelledCount = 0;

            for (const [key, timeout] of pendingKicks.entries()) {
                if (key.startsWith(user.id)) {
                    clearTimeout(timeout);
                    pendingKicks.delete(key);
                    cancelledCount++;
                }
            }

            if (cancelledCount > 0) {
                await sendLog(client, 
             // ⌛ 
      "Timers Cancelled", 
                    `**User:** **${displayName}** (${user.username})\n**Reason:** Rejoined Main Server.\n**Saved From:** ${cancelledCount} kicks.`, 
                    0x57F287, // Green
                    user
                );
            }
        });
        
        // ====================================================
        // 3. MEMBER JOINED A NETWORK SERVER -> SILENT TIMER
        // ====================================================
        client.on('guildMemberAdd', async (member) => {
            if (member.guild.id === MAIN_SERVER_ID) return; 
            if (member.user.bot) return;

            const isProtected = await ServerList.exists({ serverId: member.guild.id });
            if (!isProtected) return;

            const mainGuild = client.guilds.cache.get(MAIN_SERVER_ID);
            const inMain = await mainGuild.members.fetch(member.id).catch(() => null);
            const user = member.user;
            const displayName = user.globalName || user.username;

            if (!inMain) {
                if (member.premiumSince) return; // Booster check

                // 🔇 REMOVED LOG HERE (Silent Timer Start)

                setTimeout(async () => {
                    const freshInMain = await mainGuild.members.fetch(member.id).catch(() => null);
                    if (!freshInMain) {
                        const currentMem = await member.guild.members.fetch(member.id).catch(() => null);
                        if (currentMem && !currentMem.premiumSince) { 
                             await currentMem.kick('Qabilatan: User not in Main Server.');
                             
                             // 🥾 LOG KICK (We still log if they actually get kicked)
                             await sendLog(client, 
                                "Member Kicked", 
                                `**User:** **${displayName}** (${user.username})\n**Server:** ${member.guild.name}\n**Reason:** Not in Main Server (10m expired).`, 
                                0xFF0000, // Red
                                user
                            );
                        }
                    }
                }, KICK_DELAY_MS);
            }
        });
    }
};
