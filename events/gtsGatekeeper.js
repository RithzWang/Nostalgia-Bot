const { Events } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

async function initiate10MinKick(member, client, hub, reason) {
    if (member.premiumSince) return; // Booster immunity
    
    const srvData = await GTSServer.findOne({ serverId: member.guild.id });
    if (srvData && srvData.specialGuestRole && member.roles.cache.has(srvData.specialGuestRole)) return; // Guest immunity

    setTimeout(async () => {
        const target = await member.guild.members.fetch(member.id).catch(() => null);
        if (!target || target.premiumSince) return; 

        const mainGuild = client.guilds.cache.get(hub.mainServerId);
        if (mainGuild) {
            try {
                await mainGuild.members.fetch(member.id);
                return; // Safe!
            } catch (e) {}
        }
        await target.kick(`GTS Gatekeeper: ${reason}`).catch(() => {});
    }, 10 * 60 * 1000);
}

module.exports = (client) => {
    // 1. Welcome & Initial Gatekeeper
    client.on(Events.GuildMemberAdd, async (member) => {
        if (member.user.bot) return;
        const hub = await GTSHub.findOne();
        if (!hub || member.guild.id === hub.mainServerId) return;

        const srvData = await GTSServer.findOne({ serverId: member.guild.id });
        if (!srvData || !srvData.greetChannel) return;

        const mainGuild = client.guilds.cache.get(hub.mainServerId);
        const mainSrvData = await GTSServer.findOne({ serverId: hub.mainServerId });
        const inviteLink = mainSrvData?.inviteLink || "https://discord.com";

        let inMain = false;
        if (mainGuild) {
            try { await mainGuild.members.fetch(member.id); inMain = true; } catch (e) {}
        }

        const channel = member.guild.channels.cache.get(srvData.greetChannel);
        if (!channel) return;

        if (inMain) {
            channel.send(`<@&1456197055117787136>, Welcome to **${member.guild.name}** server!`).catch(() => {});
        } else {
            channel.send(
                `<@&1456197055117787136>, Welcome to **${member.guild.name}**\n\n` +
                `It seems like you are **__not__** in our main **[${mainGuild ? mainGuild.name : "Hub Server"}](${inviteLink})** server yet.\n` +
                `You have **10** minutes to join, otherwise you will be **kicked**.`
            ).catch(() => {});
            
            initiate10MinKick(member, client, hub, "Did not join Main Server within 10 minutes of entry.");
        }
    });

    // 2. Leaves Main Server -> Kick from Satellites
    client.on(Events.GuildMemberRemove, async (member) => {
        const hub = await GTSHub.findOne();
        if (!hub || member.guild.id !== hub.mainServerId) return;

        const satellites = await GTSServer.find({ serverId: { $ne: hub.mainServerId } });
        for (const sat of satellites) {
            const guild = client.guilds.cache.get(sat.serverId);
            if (!guild) continue;
            const satMember = await guild.members.fetch(member.id).catch(() => null);
            if (satMember) {
                initiate10MinKick(satMember, client, hub, "Left the Main Server.");
            }
        }
    });

    // 3. Stops Boosting -> Check Main Hub
    client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
        if (oldMember.premiumSince && !newMember.premiumSince) { 
            const hub = await GTSHub.findOne();
            if (!hub || newMember.guild.id === hub.mainServerId) return;

            const mainGuild = client.guilds.cache.get(hub.mainServerId);
            if (mainGuild) {
                try {
                    await mainGuild.members.fetch(newMember.id);
                } catch (e) {
                    initiate10MinKick(newMember, client, hub, "Lost Booster immunity and is not in Main Server.");
                }
            }
        }
    });
};
