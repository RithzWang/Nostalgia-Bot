const { 
    Events, MessageFlags, ContainerBuilder, SectionBuilder, ThumbnailBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');
const { GTSHub, GTSTimer } = require('../../src/models/GTS'); 

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        const hub = await GTSHub.findOne();
        if (!hub || !hub.alertChannelId) return;

        const alertChannel = member.client.channels.cache.get(hub.alertChannelId);
        if (!alertChannel) return;

        const userAvatar = member.user.displayAvatarURL({ size: 1024, forceStatic: false }) || "https://cdn.discordapp.com/embed/avatars/0.png";
        const globalName = member.user.globalName || member.user.username;
        const username = member.user.username;
        const currentTimestamp = Math.floor(Date.now() / 1000);

        // ====================================================
        // SCENARIO 1: USER JOINS THE MAIN SERVER
        // ====================================================
        if (member.guild.id === hub.mainServerId) {
            const pendingTimers = await GTSTimer.find({ userId: member.id });
            
            if (pendingTimers.length > 0) {
                const kickCount = pendingTimers.length;
                const kickText = kickCount === 1 ? 'Kick' : 'Kicks';

                // Delete timers
                await GTSTimer.deleteMany({ userId: member.id });

                // V2 "Timers Cancelled" Alert
                const container = new ContainerBuilder()
                    .setAccentColor(3066993)
                    .addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent("## Timers Cancelled"),
                                new TextDisplayBuilder().setContent(`**${globalName}** (${username})\n**ID:** \`${member.id}\`\n**Reason:** Rejoined Main Server\n**Saved From:** **${kickCount}** ${kickText}`)
                            )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${currentTimestamp}:f>`));

                await alertChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
            }
            return; 
        }

        // ====================================================
        // SCENARIO 2: USER JOINS A SATELLITE SERVER
        // ====================================================
        const mainGuild = member.client.guilds.cache.get(hub.mainServerId);
        if (!mainGuild) return;

        const isInMainServer = await mainGuild.members.fetch(member.id).catch(() => null);
        if (isInMainServer) return; 

        const existingTimer = await GTSTimer.findOne({ userId: member.id, guildId: member.guild.id });
        if (existingTimer) return; 

        // Start 10-minute timer
        const kickTime = Date.now() + (10 * 60 * 1000); 
        await GTSTimer.create({ userId: member.id, guildId: member.guild.id, kickAt: kickTime });

        // V2 "Timer Started" Alert (Not in Main Server)
        const container = new ContainerBuilder()
            .setAccentColor(15105570)
            .addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## Timer Started"),
                        new TextDisplayBuilder().setContent(`**${globalName}** (${username})\n**ID:** \`${member.id}\`\n**Server:** ${member.guild.name}\n**Reason:** Not in Main Server\n**Action:** will be kicked in **__10__** mins if they don’t join Main Server`)
                    )
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${currentTimestamp}:f>`));

        await alertChannel.send({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    }
};
