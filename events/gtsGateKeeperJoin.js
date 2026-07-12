const { Events } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');
const { startTimer, cancelAllTimersForUser } = require('../utils/gtsTimerManager');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        if (member.user.bot) return;

        const client = member.client;
        const hub = await GTSHub.findOne();
        if (!hub) return;

        // ==========================================
        // 🟢 SCENARIO: User joins the Main Server
        // Action: Cancel ALL active timers against them
        // ==========================================
        if (member.guild.id === hub.mainServerId) {
            await cancelAllTimersForUser(member.user, client, hub, "Rejoined Main Server");
            return;
        }

        // ==========================================
        // 🚨 SCENARIO: User joins a Satellite Server
        // Action: Check Hub presence, Greet, and Start Timer
        // ==========================================
        const srvData = await GTSServer.findOne({ serverId: member.guild.id });
        if (!srvData) return;

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

        const greetChannel = srvData.greetChannel ? member.guild.channels.cache.get(srvData.greetChannel) : null;

        if (inMain) {
            if (greetChannel) greetChannel.send(`<@${member.id}>, Welcome to **${member.guild.name}**!`).catch(() => {});
        } else {
            if (greetChannel) {
                greetChannel.send(
                    `<@${member.id}>, Welcome to **${member.guild.name}**!\n\n` +
                    `It seems like you are **__not__** in our **[Main Server](<${inviteLink}>)** yet.\n` +
                    `You have **10** minutes to join, otherwise you will be **kicked**.`
                ).catch(() => {});
            }
            
            // ⏱️ FIRE TIMER ENGINE
            startTimer(member, client, hub, "Not in Main Server", "will be kicked in **__10__** mins if they don’t join Main Server");
        }
    }
};