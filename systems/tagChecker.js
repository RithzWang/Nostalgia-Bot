const TAG_CONFIG = {
    targetServerID: "1456197054782111756",      // YOUR SERVER ID
    rewardRoleID: "1462217123433545812"         // THE ROLE ID
};

module.exports = (client) => {
    if (client.isReady()) startLoop(client);
    else client.once('clientReady', () => startLoop(client));

    client.on('messageCreate', async (message) => {
        if (!message.guild || message.guild.id !== TAG_CONFIG.targetServerID || message.author.bot) return;
        await checkMemberTag(message.member, message.guild);
    });
};

function startLoop(client) {
    console.log("✅ Tag Checker Started.");
    runSweep(client);
    setInterval(() => runSweep(client), 1 * 1000);
}

async function runSweep(client) {
    const guild = client.guilds.cache.get(TAG_CONFIG.targetServerID);
    if (!guild) return;
    try { await guild.members.fetch({ force: true }); } catch (e) {}

    guild.members.cache.forEach(async (member) => {
        if (member.user.bot) return;
        await checkMemberTag(member, guild);
    });
}

async function checkMemberTag(member, guild) {
    const role = guild.roles.cache.get(TAG_CONFIG.rewardRoleID);
    if (!role) return;

    // --- GET DATA ---
    const userTagData = member.user.primaryGuild;
    
    // Check if valid
    const isWearingTag = userTagData && 
                         userTagData.identityGuildId === TAG_CONFIG.targetServerID;
    
    const hasRole = member.roles.cache.has(role.id);

    // --- DEBUGGING (Use this to find the bug) ---
    // If the bot decides to GIVE the role, it will print WHY it did it.
    if (isWearingTag && !hasRole) {
        console.log(`🚨 GIVING ROLE TO: ${member.user.tag}`);
        console.log(`   Reason: Discord API says they have Tag ID: ${userTagData.identityGuildId}`);
        console.log(`   (Matching Target ID: ${TAG_CONFIG.targetServerID})`);
        
        try { await member.roles.add(role); } catch (e) {}
    }

    else if (!isWearingTag && hasRole) {
        console.log(`🗑️ REMOVING ROLE FROM: ${member.user.tag} (No Tag Detected)`);
        try { await member.roles.remove(role); } catch (e) {}
    }
}
