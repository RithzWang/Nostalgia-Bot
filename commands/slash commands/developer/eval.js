const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require('discord.js');
const djs = require('discord.js'); // Required for injecting classes into the evaluator
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convert')
        .setDescription('Developer command: Convert D.JS code into a live message payload.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Extra layer of safety

        // --- SUBCOMMAND: SEND ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Executes component code and sends it as a new message')
                .addStringOption(option => 
                    option.setName('code')
                    .setDescription('The discord.js code to evaluate (defines components, embeds, etc.)')
                    .setRequired(true))
        )

        // --- SUBCOMMAND: EDIT ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Executes component code and edits an existing message')
                .addStringOption(option => 
                    option.setName('message_id')
                    .setDescription('The ID of the message to edit')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('code')
                    .setDescription('The discord.js code to evaluate')
                    .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                    .setDescription('The channel the message is in (defaults to current channel)'))
        ),

    async execute(interaction) {
        // ==========================================
        // 🔒 SECURITY LOCK
        // ==========================================
        const DEVELOPER_ID = '837741275603009626'; 
        
        if (interaction.user.id !== DEVELOPER_ID) {
            return interaction.reply({ 
                content: '<:no:1297814819105144862> You are not authorized to use this developer command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const codeString = interaction.options.getString('code');
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Keep the setup hidden

        try {
            // --- 1. CLEAN THE CODE ---
            // Remove markdown formatting and common import/require statements so it doesn't crash the evaluator
            let cleanCode = codeString
                .replace(/[`]{3}(?:js|javascript)?\n?/g, '')
                .replace(/[`]{3}/g, '')
                .replace(/import\s+.*?\s+from\s+['"][^'"]+['"];?/g, '')
                .replace(/const\s+\{.*?\}\s*=\s*require\(.*?\);?/g, '');

            // --- 2. BUILD THE EVALUATOR ---
            // We create an isolated async function and inject ALL discord.js classes into its scope.
            const asyncEvaluator = new Function('discord', `
                return (async () => {
                    const { ${Object.keys(djs).join(', ')} } = discord;
                    
                    // --- YOUR EXECUTED CODE ---
                    ${cleanCode}
                    // --------------------------

                    // Automatically return whatever variables you defined in your code
                    return {
                        content: typeof content !== 'undefined' ? content : undefined,
                        embeds: typeof embeds !== 'undefined' ? embeds : undefined,
                        components: typeof components !== 'undefined' ? components : undefined,
                        files: typeof files !== 'undefined' ? files : undefined
                    };
                })();
            `);

            // Run the code and get the message payload
            const payload = await asyncEvaluator(djs);

            // Ensure the payload actually contains something
            if (!payload.content && !payload.embeds && !payload.components && !payload.files) {
                return interaction.editReply('<:no:1297814819105144862> The code evaluated successfully, but didn\'t define any `content`, `embeds`, `components`, or `files`.');
            }

            // --- 3. EXECUTE SUBCOMMANDS ---
            const thailandTime = moment().tz('Asia/Bangkok').format('DD/MM/YYYY HH:mm:ss');
            
            // ---> /CONVERT SEND
            if (subcommand === 'send') {
                await interaction.channel.send(payload);
                await interaction.editReply(`✅ **Successfully converted and sent!** *(Executed at ${thailandTime} GMT+7)*`);
            }

            // ---> /CONVERT EDIT
            if (subcommand === 'edit') {
                const messageId = interaction.options.getString('message_id');
                const channel = interaction.options.getChannel('channel') || interaction.channel;

                const targetMessage = await channel.messages.fetch(messageId).catch(() => null);
                
                if (!targetMessage) {
                    return interaction.editReply('<:no:1297814819105144862> Could not find a message with that ID in the target channel.');
                }

                if (targetMessage.author.id !== interaction.client.user.id) {
                    return interaction.editReply('<:no:1297814819105144862> I can only edit my own messages.');
                }

                await targetMessage.edit(payload);
                await interaction.editReply(`✅ **Successfully converted and edited the message!** *(Executed at ${thailandTime} GMT+7)*`);
            }

        } catch (error) {
            console.error('Code Evaluation Error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('<:no:1297814819105144862> Evaluation Failed')
                .setDescription(`\`\`\`js\n${error.message}\n\`\`\``);

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};