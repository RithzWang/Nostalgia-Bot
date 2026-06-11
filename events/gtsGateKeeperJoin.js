const { Events, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { GTSHub, GTSTimer } = require('../src/models/GTS'); 

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const hub = await GTSHub.findOne();
        if (!hub || !hub.alertChannelId) return;

        // ====================================================
        // SCENARIO: USER JOINS THE MAIN SERVER
        // ====================================================
        if (member.guild.id === hub.mainServerId) {
            // 1. Find ALL active timers for this user across any satellite server
            const pendingTimers = await GTSTimer.find({ userId: member.id });
            
            // If they have timers, we need to cancel them and send the summary alert
            if (pendingTimers.length > 0) {
                const kickCount = pendingTimers.length;
                const kickText = kickCount === 1 ? "1 Kick" : `${kickCount} Kicks`;

                // 2. Wipe all their timers from the database
                await GTSTimer.deleteMany({ userId: member.id });

                // 3. Send ONE clean summary alert (No "Server:" line, added "Saved From:")
                const alertChannel = member.client.channels.cache.get(hub.alertChannelId);
                if (alertChannel) {
                    const container = new ContainerBuilder()
                        .addSectionComponents(
                            new SectionBuilder()
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent("## ✅ Timer Cancelled"),
                                    new TextDisplayBuilder().setContent(
                                        `**User:** <@${member.id}>\n` +
                                        `**Saved From:** ${kickText}`
                                    )
                                )
                        );

                    await alertChannel.send({
                        components: [container],
                        flags: [MessageFlags.IsComponentsV2]
                    });
                }
            }
            return; // Stop here, since they joined the main server
        }

        // ====================================================
        // SCENARIO: USER JOINS A SATELLITE SERVER
        // ====================================================
        // (If they didn't join the main server, they joined a satellite)
        const mainGuild = member.client.guilds.cache.get(hub.mainServerId);
        if (!mainGuild) return;

        const isInMainServer = await mainGuild.members.fetch(member.id).catch(() => null);
        if (isInMainServer) return; // Safe, do nothing

        // Check for an existing timer in THIS SPECIFIC server
        const existingTimer = await GTSTimer.findOne({ userId: member.id, guildId: member.guild.id });
        if (existingTimer) return; 

        // Start timer and send alert for this specific satellite
        const kickTime = Date.now() + (24 * 60 * 60 * 1000); 
        const timestamp = `<t:${Math.floor(kickTime / 1000)}:R>`;

        await GTSTimer.create({ userId: member.id, guildId: member.guild.id, kickAt: kickTime });

        const alertChannel = member.client.channels.cache.get(hub.alertChannelId);
        if (alertChannel) {
            const container = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## Timer Started"),
                            new TextDisplayBuilder().setContent(
                                `**User:** <@${member.id}>\n` +
                                `**Action:** Kick ${timestamp}`
                            )
                        )
                );

            await alertChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }
    }
};
