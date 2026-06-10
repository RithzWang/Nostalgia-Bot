const { Events } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

async function initiate10MinKick(member, client, hub, reason) {
    if (member.premiumSince) return; 
    
    const srvData = await GTSServer.findOne({ serverId: member.guild.id });
    if (srvData && srvData.specialGuestRole && member.roles.cache.has(srvData.specialGuestRole)) return; 

    setTimeout(async () => {
        const target = await member.guild.members.fetch(member.id).catch(() => null);
        if (!target || target.premiumSince) return; 

        const mainGuild = client.guilds.cache.get(hub.mainServerId);
        if (mainGuild) {
            try {
                await mainGuild.members.fetch(member.id);
                return; 
            } catch (e) {}
        }
        await target.kick(`GTS Gatekeeper: ${reason}`).catch(() => {});
    }, 10 * 60 * 1000);
}

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;

        // ✅ Securely fetch client
        const client = member.client;
        
        const hub = await GTSHub.findOne();
        if (!hub || member.guild.id === hub.mainServerId) return;

        const srvData = await GTSServer.findOne({ serverId: member.guild.id });
        if (!srvData || !srvData.greetChannel) return;

        const mainGuild = client.guilds.cache.get(hub.mainServerId);
        const mainSrvData = await GTSServer.findOne({ serverId: hub.mainServerId });
        const inviteLink = mainSrvData?.inviteLink || "https://discord.com";

        let inMain = false;
        if (mainGuild) {
            try { 
                await mainGuild.members.fetch(member.id); 
                inMain = true; 
            } catch (e) {}
        }

        const channel = member.guild.channels.cache.get(srvData.greetChannel);
        if (!channel) return;

        if (inMain) {
            channel.send(`<@&1456197055117787136>, Welcome to **${member.guild.name}** server!`).catch(err => console.error("Greet Error:", err));
        } else {
            channel.send(
                `<@&1456197055117787136>, Welcome to **${member.guild.name}**\n\n` +
                `It seems like you are **__not__** in our main **[${mainGuild ? mainGuild.name : "Hub Server"}](${inviteLink})** server yet.\n` +
                `You have **10** minutes to join, otherwise you will be **kicked**.`
            ).catch(err => console.error("Greet Error:", err));
            
            initiate10MinKick(member, client, hub, "Did not join Main Server within 10 minutes of entry.");
        }
    }
};
