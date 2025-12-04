const { EmbedBuilder, ChannelType } = require('discord.js');

module.exports = {
  name: "embed",
  description: "Send an embed to a specific channel",
  async execute(message, args) {
    const input = args.join(" ");
    const [channelMention, rest] = input.split(/ (.+)/);

    const channel = message.mentions.channels.first();
    if (!channel || channel.type !== ChannelType.GuildText)
      return message.reply("Please mention a valid text channel!");

    if (!rest || !rest.includes("|"))
      return message.reply("Use this format: `!embed #channel Title | Description`");

    const [title, ...descParts] = rest.split("|");
const description = descParts.join("|").trim();

    const embed = new EmbedBuilder()
      .setTitle(title || "No Title")
      .setDescription(description || "No Description")
      .setColor("#888888");

    await channel.send({ embeds: [embed] });
    await message.reply(`✅ Embed sent to ${channel}`);
  },
};