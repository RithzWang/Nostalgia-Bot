const { 
    SlashCommandBuilder,
    ContainerBuilder, 
    MessageFlags, 
    TextDisplayBuilder,      
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal-emoji')
        .setDescription('Steals one or multiple emojis and adds them to this server')
        .setDMPermission(false)
        // 1. Permission Check (User) handled natively by Discord:
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers)
        .addStringOption(opt => opt
            .setName('emoji') // Changed from 'emojis' to 'emoji'
            .setDescription('Paste the emojis you want to steal here')
            .setRequired(true)
        ),

    async execute(interaction) {
        try {
            // 2. Permission Check (Bot)
            if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageEmojisAndStickers)) {
                return interaction.reply({ 
                    content: `I need the **Manage Emojis** permission to do this.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // 3. Parse Emojis from Input
            const inputString = interaction.options.getString('emoji'); // Changed to match option name
            
            // Regex to find: <(optional a):name:id>
            const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/g;
            const matches = [...inputString.matchAll(emojiRegex)];

            if (matches.length === 0) {
                return interaction.reply({
                    content: `❌ I couldn't find any valid custom emojis in your input.`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Defer the reply so the command doesn't timeout while fetching/creating multiple emojis
            await interaction.deferReply();

            const addedEmojis = [];
            const failedEmojis = [];

            // 4. Process Steal Logic
            for (const match of matches) {
                const isAnimated = match[1] === 'a';
                const name = match[2];
                const id = match[3];
                const extension = isAnimated ? 'gif' : 'png';
                const url = `https://cdn.discordapp.com/emojis/${id}.${extension}`;

                try {
                    const createdEmoji = await interaction.guild.emojis.create({ 
                        attachment: url, 
                        name: name 
                    });
                    addedEmojis.push(createdEmoji);
                } catch (err) {
                    console.error(`Failed to add ${name}:`, err);
                    failedEmojis.push(name);
                }
            }

            if (addedEmojis.length === 0 && failedEmojis.length === 0) return;

            // 5. Builder
            const createResultContainer = () => {
                const count = addedEmojis.length;
                const titleText = `## Emoji Stealer`;
                
                let bodyText = ``;
                if (count > 0) {
                    bodyText += `**Successfully stole ${count} emoji(s):**\n`;
                    bodyText += addedEmojis.map(e => `<${e.animated ? 'a' : ''}:${e.name}:${e.id}> \`:${e.name}:\``).join('\n');
                }
                
                if (failedEmojis.length > 0) {
                    bodyText += count > 0 ? `\n\n` : ``;
                    bodyText += `**Failed to add:** ${failedEmojis.join(', ')} (File size too big or no slots?)`;
                }

                const container = new ContainerBuilder()
                    .setAccentColor(0x888888) 
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${titleText}\n${bodyText}`));

                return container;
            };

            // 6. Send Reply (Using editReply since it was deferred)
            await interaction.editReply({ 
                components: [createResultContainer()], 
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error(error);
            // Catch block to gracefully handle unexpected errors during interaction
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ content: `❌ An unexpected error occurred.` });
            } else {
                await interaction.reply({ content: `❌ An unexpected error occurred.`, flags: MessageFlags.Ephemeral });
            }
        }
    }
};
