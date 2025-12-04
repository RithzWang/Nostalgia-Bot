const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: "editembed",
  description: "Edit an existing embed message",
  async execute(message, args) {
    const input = args.join(" ");
    const [channelMention, messageId, ...restParts] = input.split(" ");
    const rest = restParts.join(" ");

    const channel = message.mentions.channels.first();
    if (!channel || channel.type !== ChannelType.GuildText)
      return message.reply("Please mention a valid text channel!");

    if (!messageId || isNaN(messageId))
      return message.reply("Please provide a valid message ID!");

    if (!rest || !rest.includes("|"))
      return message.reply("Use this format: `!editembed #channel messageID Title | Description`");

    const [title, description] = rest.split("|").map(s => s.trim());

    try {
      const msg = await channel.messages.fetch(messageId);
      if (!msg)
        return message.reply("Message not found or I can’t access it.");

      const embed = new EmbedBuilder()
        .setTitle(title || "No Title")
        .setDescription(description || "No Description")
        .setColor("#888888")
        .setTimestamp()
        .setFooter({ text: `Edited by ${message.author.tag}` });

      await msg.edit({ embeds: [embed] });
      await message.reply(`✅ Embed in ${channel} updated successfully.`);
    } catch (err) {
      console.error(err);
      message.reply("⚠️ I couldn’t edit that message. Make sure the ID and channel are correct.");
    }
  },
};