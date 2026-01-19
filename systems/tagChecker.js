const TAG_CONFIG = {
    targetServerID: "1456197054782111756",      // YOUR SERVER ID
    rewardRoleID: "1462217123433545812"         // THE ROLE ID
};

module.exports = (client) => {
    // 1. Startup & Interval
    if (client.isReady()) startLoop(client);
    else client.once('clientReady', () => startLoop(client));

    // 2. Chat Event (Instant Check)
    client.on('messageCreate', async (message) => {
        if (!message.guild || message.guild.id !== TAG_CONFIG.targetServerID || message.author.bot) return;
        await checkMemberTag(message.member, message.guild, client);
    });
};

function startLoop(client) {
    console.log("✅ Tag Checker Started (High Precision Mode).");
    runSweep(client);
    setInterval(() => runSweep(client), 1 * 5000); // Check every 60s
}

async function runSweep(client) {
    const guild = client.guilds.cache.get(TAG_CONFIG.targetServerID);
    if (!guild) return;

    try {
        // FORCE FETCH: Downloads fresh data from Discord to ensure no "Ghost" tags
        await guild.members.fetch({ force: true });
    } catch (e) { console.error("Fetch Error:", e); }

    guild.members.cache.forEach(async (member) => {
        if (member.user.bot) return;
        await checkMemberTag(member, guild, client);
    });
}

async function checkMemberTag(member, guild, client) {
    const role = guild.roles.cache.get(TAG_CONFIG.rewardRoleID);
    if (!role) return;

    // --- GET DATA ---
    // This comes from your custom User class
    const userTagData = member.user.primaryGuild;

    // --- CRITICAL CHECKS ---
    // 1. Must have tag data
    // 2. ID must match your server
    // 3. identityEnabled MUST be true (User must actually be SHOWING it)
    const isWearingTag = userTagData && 
                         userTagData.identityGuildId === TAG_CONFIG.targetServerID &&
                         userTagData.identityEnabled === true; // <--- THIS WAS MISSING
    
    const hasRole = member.roles.cache.has(role.id);

    // --- LOGIC ---

    // A. GIVE ROLE
    if (isWearingTag && !hasRole) {
        try {
            await member.roles.add(role);
            console.log(`✅ [Tag Fix] Added role to ${member.user.tag} (Visible Tag Detected)`);
        } catch (e) { console.error(e); }
    }

    // B. REMOVE ROLE
    else if (!isWearingTag && hasRole) {
        // If they have the role, but "isWearingTag" is false
        // This removes it if they switch servers OR if they simply hide the tag
        try {
            await member.roles.remove(role);
            console.log(`❌ [Tag Fix] Removed role from ${member.user.tag} (Tag missing or hidden)`);
        } catch (e) { console.error(e); }
    }
}
