const { fetchAdvancedProfile } = require('../utils/v9Scraper');
const NitroConfig = require('../models/NitroConfig');

// A simple Set to act as a cooldown so we don't check the same user 100 times a minute
const recentChecks = new Set(); 

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // 1. Cooldown Check (Skip if we already checked them in the last 12 hours)
        if (recentChecks.has(message.author.id)) return;

        // 2. Database Check (Does this server have auto-nitro enabled?)
        const config = await NitroConfig.findOne({ guildId: message.guild.id });
        if (!config) return;

        try {
            // Add user to cooldown immediately to prevent spam
            recentChecks.add(message.author.id);
            setTimeout(() => recentChecks.delete(message.author.id), 12 * 60 * 60 * 1000); // 12-hour cooldown

            // 3. Hit the API with the burner account
            const v10Data = await fetchAdvancedProfile(message.author.id).catch(() => null);
            if (!v10Data) return;

            // 4. Determine Nitro Status
            const hasNitro = !!(v10Data.premium_type || v10Data.premium_since);
            const member = message.member;

            // 5. Automatically Apply/Remove Roles
            const hasNitroRole = member.roles.cache.has(config.withNitroRoleId);
            const hasNoNitroRole = member.roles.cache.has(config.noNitroRoleId);

            if (hasNitro) {
                if (!hasNitroRole) await member.roles.add(config.withNitroRoleId).catch(() => {});
                if (hasNoNitroRole) await member.roles.remove(config.noNitroRoleId).catch(() => {});
            } else {
                if (!hasNoNitroRole) await member.roles.add(config.noNitroRoleId).catch(() => {});
                if (hasNitroRole) await member.roles.remove(config.withNitroRoleId).catch(() => {});
            }

        } catch (error) {
            // Fails silently in the background so it doesn't interrupt chat
            console.error("Auto-Nitro Sync Error:", error);
        }
    }
};
