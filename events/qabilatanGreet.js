// events/qabilatanGreet.js
const { GreetConfig, ServerList } = require('../src/models/Qabilatan'); // Adjust path if needed
const { serverID } = require('../config.json'); 

const MAIN_SERVER_ID = serverID; 
const MAIN_SERVER_INVITE = "https://discord.gg/Sra726wPJs";

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        if (member.user.bot) return;

        // Skip if this is the Main Server
        if (member.guild.id === MAIN_SERVER_ID) return;

        // 1. Check DB if this specific guild has Greet enabled
        const qabilatanConfig = await GreetConfig.findOne({ guildId: member.guild.id });
        if (!qabilatanConfig) return; 

        try {
            // 2. Fetch Server Name
            const serverInfo = await ServerList.findOne({ serverId: member.guild.id });
            const serverName = serverInfo ? serverInfo.name : member.guild.name;

            // 3. Check if User is in Main Server (A2-Q)
            const mainGuild = client.guilds.cache.get(MAIN_SERVER_ID);
            let inMainServer = false;
            
            try {
                if (mainGuild) {
                    await mainGuild.members.fetch(member.id);
                    inMainServer = true;
                }
            } catch (e) {
                inMainServer = false;
            }

            const channel = member.guild.channels.cache.get(qabilatanConfig.channelId);
            if (!channel) return;

            // 4. Send Message based on Status
            if (inMainServer) {
                // ✅ User is Safe
                channel.send(`${member}, Welcome to **${serverName}** server!`);
            } else {
                // ⚠️ Warn user they need to join Main Server
                channel.send(
                    `${member}, Welcome to **${serverName}** server!\n\n` +
                    `It seems like you are **__not__** in our **[A2-Q](<${MAIN_SERVER_INVITE}>)** Main Server yet.\n` +
                    `You have **10 minutes** to join, otherwise you will be **kicked**.`
                );

                // ⏳ 10 Minute Kick Timer
                setTimeout(async () => {
                    const target = await member.guild.members.fetch(member.id).catch(() => null);
                    if (!target) return; // They already left

                    // Re-check Main Server (Did they join?)
                    try {
                        await mainGuild.members.fetch(member.id);
                        return; // They joined! Cancel kick.
                    } catch (e) {}

                    // Safety: Do not kick Boosters
                    if (target.premiumSince) return;

                    try {
                        await target.kick("Automatic Kick: Did not join A2-Q Main Server.");
                        // ❌ DELETED: The line that announces the kick
                    } catch (err) {
                        console.error(`Failed to kick user in ${member.guild.name}:`, err);
                    }
                }, 10 * 60 * 1000); // 10 Minutes
            }
        } catch (e) {
            console.error("Qabilatan Greet Error:", e);
        }
    }
};
