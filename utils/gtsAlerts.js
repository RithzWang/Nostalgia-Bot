const { ContainerBuilder, SectionBuilder, ThumbnailBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');

/**
 * Generates V2 Component Alert Containers
 * @param {'start' | 'cancel' | 'kick'} type 
 * @param {Object} user - Target Discord User object
 * @param {String} serverName - Guild name where the violation happened
 * @param {String} reason - Reason for the action
 * @param {String} actionOrSaved - Either the action text (mins left) or the saved kick amount string
 */
function buildAlertPayload(type, user, serverName, reason, actionOrSaved = null) {
    let accentColor = 15105570; 
    let title = "## Timer Started";
    let extraLine = actionOrSaved ? `**Action:** ${actionOrSaved}` : null;
    
    if (type === 'cancel') {
        accentColor = 3066993; 
        title = "## Timers Cancelled";
        extraLine = `**Saved From:** **${actionOrSaved}** Kick/Kicks`;
    } else if (type === 'kick') {
        accentColor = 15548997; 
        title = "## Member Kicked";
        extraLine = null; 
    }

    const userAvatar = user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: false }) || "https://cdn.discordapp.com/embed/avatars/0.png";
    
    let descriptionText = `**${user.globalName || user.username}** (${user.username})\n` +
                          `**ID:** \`${user.id}\`\n` +
                          `**Server:** ${serverName}\n` +
                          `**Reason:** ${reason}`;
    
    if (extraLine) descriptionText += `\n${extraLine}`;

    const container = new ContainerBuilder()
        .setAccentColor(accentColor)
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(title),
                    new TextDisplayBuilder().setContent(descriptionText)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now() / 1000)}:f>`));

    return [container];
}

module.exports = { buildAlertPayload };
