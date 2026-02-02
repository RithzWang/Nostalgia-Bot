// events/qabilatanGreet.js
const { GreetConfig, ServerList } = require('../src/models/Qabilatan'); // Make sure path is correct relative to events/
const { serverID } = require('../config.json'); // Main server ID from config

const MAIN_SERVER_ID = serverID; 
const MAIN_SERVER_INVITE = "https://discord.gg/Sra726wPJs";

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        if (member.user.bot) return;

        // Skip if this is the Main Server (Main server is handled in index.js)
        if (member.guild.id === MAIN_SERVER_ID) return;

        // 1. Check DB if this specific guild has Greet enabled
        const qabilatanConfig = await GreetConfig.findOne({ guildId: member.guild.id });
        if (!qabilatanConfig) return; // Feature not enabled here

        try {
            // 2. Fetch Server Name from DB (for consistent naming)
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
                // ⚠️ User is Not in Main Server -> Warn & Kick Timer
                channel.send(
                    `${member}, Welcome to **${serverName}** server!\n\n` +
                    `It seems like you are **__not__** in our **[A2-Q](<${MAIN_SERVER_INVITE}>)** Main Server yet.\n` +
                    `You have **10 minutes** to join, otherwise you will be **kicked**.`
                );

                // ⏳ 10 Minute Kick Timer
                setTimeout(async () => {
                    // Check if member is still in THIS server
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
                        channel.send(`**${target.user.tag}** has been kicked for not joining the main server.`);
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
