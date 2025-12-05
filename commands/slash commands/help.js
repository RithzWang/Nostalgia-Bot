const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of available commands.')
        .addStringOption(option => 
            option.setName('command')
                .setDescription('The specific command to get info about')
                .setRequired(false)
        ),

    async execute(interaction) {
        // 1. Get the list of commands from the bot
        // (Assumes you are using a standard command handler where commands are in client.commands)
        const { commands } = interaction.client;
        const commandName = interaction.options.getString('command');

        // CASE 1: General Help (No specific command requested)
        if (!commandName) {
            const embed = new EmbedBuilder()
                .setTitle('📚 Help Menu')
                .setDescription('Here are the available commands. Use `/help [command]` for more details.')
                .setColor('#5865F2')
                .setThumbnail(interaction.client.user.displayAvatarURL());

            // Loop through commands and add them to the embed
            // We use map() to format them nicely
            const commandList = commands.map(cmd => {
                return `**/${cmd.data.name}**\n${cmd.data.description}`;
            }).join('\n\n');

            embed.addFields({ name: 'Commands', value: commandList });

            return interaction.reply({ embeds: [embed] });
        }

        // CASE 2: Specific Command Help
        const command = commands.get(commandName.toLowerCase());

        if (!command) {
            return interaction.reply({ content: `❌ I couldn't find a command named \`/${commandName}\`.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📖 Command: /${command.data.name}`)
            .setDescription(command.data.description)
            .setColor('#5865F2')
            .addFields(
                { name: 'Usage', value: `\`/${command.data.name}\``, inline: true }
                // You can add more fields here if your commands have permissions or cooldowns defined
            );

        // Check if the command has options (arguments) and list them
        if (command.data.options.length > 0) {
            const args = command.data.options.map(opt => {
                return `\`${opt.name}\`: ${opt.description} (${opt.required ? 'Required' : 'Optional'})`;
            }).join('\n');
            embed.addFields({ name: 'Options/Arguments', value: args });
        }

        return interaction.reply({ embeds: [embed] });
    },
};
