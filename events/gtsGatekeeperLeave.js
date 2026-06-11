const { 
    Events, MessageFlags, ContainerBuilder, SectionBuilder, ThumbnailBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');
const { GTSHub, GTSTimer } = require('../src/models/GTS'); 

module.exports = {
    name: Events.GuildMemberRemove,
    async execute(member) {
        const hub = await GTSHub.findOne();
        if (!hub || !hub.alertChannelId) return;

        // We only trigger this if they leave the MAIN SERVER
        if (member.guild.id !== hub.mainServerId) return;

        const alertChannel = member.client.channels.cache.get(hub.alertChannelId);
        if (!alertChannel) return;

        const userAvatar = member.user.displayAvatarURL({ size: 1024, forceStatic: false }) || "https://cdn.discordapp.com/embed/avatars/0.png";
        const globalName = member.user.globalName || member.user.username;
        const username = member.user.username;
        const currentTimestamp = Math.floor(Date.now() / 1000);

        // Find all satellite servers the user is currently in
        const satelliteGuilds = [];
        for (const [guildId, guild] of member.client.guilds.cache) {
            if (guildId === hub.mainServerId) continue; 
            
            const isInSatellite = await guild.members.fetch(member.id).catch(() => null);
            if (isInSatellite) {
                satelliteGuilds.push(guild);
            }
        }

        // Apply timers and send alerts for every satellite
        for (const satellite of satelliteGuilds) {
            const existingTimer = await GTSTimer.findOne({ userId: member.id, guildId: satellite.id });
            if (existingTimer) continue;

            // Start 10-minute timer
            const kickTime = Date.now() + (10 * 60 * 1000); 
            await GTSTimer.create({ userId: member.id, guildId: satellite.id, kickAt: kickTime });

            // V2 "Timer Started" Alert (Left Main Server)
            const container = new ContainerBuilder()
                .setAccentColor(15105570)
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## Timer Started"),
                            new TextDisplayBuilder().setContent(`**${globalName}** (${username})\n**ID:** \`${member.id}\`\n**Server:** ${satellite.name}\n**Reason:** Left Main Server\n**Action:** will be kicked in **__10__** mins if they don’t return`)
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${currentTimestamp}:f>`));

            await alertChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
        }
    }
};
