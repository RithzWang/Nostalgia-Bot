const { Events, ContainerBuilder, SectionBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const { GTSHub, GTSTimer } = require('../src/models/GTS'); 

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const hub = await GTSHub.findOne();
        if (!hub || !hub.alertChannelId) return;

        // We only care if they are leaving the MAIN SERVER
        if (member.guild.id !== hub.mainServerId) return;

        const alertChannel = member.client.channels.cache.get(hub.alertChannelId);
        if (!alertChannel) return;

        // 1. Find ALL satellite servers the user is currently sitting in
        const satelliteGuilds = [];
        
        for (const [guildId, guild] of member.client.guilds.cache) {
            if (guildId === hub.mainServerId) continue; // Skip main server
            
            // Check if the user is in this guild
            const isInSatellite = await guild.members.fetch(member.id).catch(() => null);
            if (isInSatellite) {
                satelliteGuilds.push(guild);
            }
        }

        // 2. Start a timer and send an alert for EVERY satellite server they are in
        for (const satellite of satelliteGuilds) {
            // Ensure we don't duplicate timers
            const existingTimer = await GTSTimer.findOne({ userId: member.id, guildId: satellite.id });
            if (existingTimer) continue;

            const kickTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
            const timestamp = `<t:${Math.floor(kickTime / 1000)}:R>`;

            await GTSTimer.create({
                userId: member.id,
                guildId: satellite.id,
                kickAt: kickTime
            });

            // Send independent alert for this satellite
            const container = new ContainerBuilder()
                .addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## ⚠️ Timer Started"),
                            new TextDisplayBuilder().setContent(
                                `**User:** <@${member.id}>\n` +
                                `**Server:** ${satellite.name}\n` +
                                `**Action:** Kick ${timestamp}`
                            )
                        )
                );

            await alertChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }
    }
};
