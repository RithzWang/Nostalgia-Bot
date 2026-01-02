const { 
    SlashCommandBuilder, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SectionBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    MessageFlags
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('calculator')
        .setDescription('Opens a calculator inside a V2 Container'),

    async execute(interaction) {
        await interaction.deferReply();

        // --- 1. STATE VARIABLES ---
        // These track the math for this specific interaction
        let currentExpression = '';
        let displayValue = '0';
        let isResult = false; // To clear screen if typing after '='

        // --- 2. HELPER FUNCTIONS ---
        
        // A helper to quickly build the button rows
        const createCalcRows = () => {
            const btn = (label, style = ButtonStyle.Secondary, id = label) => 
                new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);

            return [
                new ActionRowBuilder().addComponents(
                    btn('AC', ButtonStyle.Danger, 'clear'),
                    btn('(', ButtonStyle.Primary),
                    btn(')', ButtonStyle.Primary),
                    btn('/', ButtonStyle.Primary)
                ),
                new ActionRowBuilder().addComponents(
                    btn('7'), btn('8'), btn('9'), btn('*', ButtonStyle.Primary)
                ),
                new ActionRowBuilder().addComponents(
                    btn('4'), btn('5'), btn('6'), btn('-', ButtonStyle.Primary)
                ),
                new ActionRowBuilder().addComponents(
                    btn('1'), btn('2'), btn('3'), btn('+', ButtonStyle.Primary)
                ),
                new ActionRowBuilder().addComponents(
                    btn('0'), 
                    btn('.'), 
                    btn('⌫', ButtonStyle.Danger, 'backspace'), 
                    btn('=', ButtonStyle.Success, 'equals')
                ),
            ];
        };

        // A helper to build the Container with the current display value
        const buildCalculatorContainer = (display) => {
            // Screen Section
            const screenText = new TextDisplayBuilder()
                .setContent(`\`\`\`\n${display}\n\`\`\``); // Code block for "screen" look
            
            const screenSection = new SectionBuilder()
                .addTextDisplayComponents(screenText);

            // Container combining Screen + Buttons
            const container = new ContainerBuilder()
                .setAccentColor(0x2B2D31) // Dark Calculator Color
                .addSectionComponents(screenSection);
            
            // Add all button rows to the container
            const rows = createCalcRows();
            for (const row of rows) {
                container.addActionRowComponents(row);
            }

            return container;
        };

        // --- 3. SEND INITIAL MESSAGE ---
        const message = await interaction.editReply({
            content: '🧮 **Calculator V2**',
            components: [buildCalculatorContainer(displayValue)],
            flags: MessageFlags.IsComponentsV2
        });

        // --- 4. HANDLE BUTTON CLICKS ---
        const collector = message.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 600000 // Active for 10 minutes
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'Only the command user can use this calculator!', flags: MessageFlags.Ephemeral });
            }

            const id = i.customId;

            // Logic Handling
            if (id === 'clear') {
                currentExpression = '';
                displayValue = '0';
                isResult = false;
            } 
            else if (id === 'backspace') {
                if (isResult) {
                    currentExpression = '';
                    isResult = false;
                } else {
                    currentExpression = currentExpression.slice(0, -1);
                }
                displayValue = currentExpression || '0';
            } 
            else if (id === 'equals') {
                try {
                    // Safe Evaluation using Function constructor restricted to math
                    // 1. Sanitize: Allow only numbers and math operators
                    const sanitized = currentExpression.replace(/[^0-9+\-*/().]/g, '');
                    // 2. Evaluate
                    const result = new Function('return ' + sanitized)();
                    
                    displayValue = String(result);
                    currentExpression = String(result);
                    isResult = true;
                } catch (e) {
                    displayValue = 'Error';
                    currentExpression = '';
                }
            } 
            else {
                // Number or Operator clicked
                if (isResult) {
                    // If we just showed a result and type a number, start fresh. 
                    // If we type an operator, keep the result and append.
                    if (['+', '-', '*', '/'].includes(id)) {
                        isResult = false;
                    } else {
                        currentExpression = '';
                        isResult = false;
                    }
                }
                currentExpression += id;
                displayValue = currentExpression;
            }

            // Update the Calculator
            await i.update({
                components: [buildCalculatorContainer(displayValue)],
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on('end', () => {
            // Optional: Disable buttons when time runs out
            interaction.editReply({ content: '🧮 **Calculator Timeout**', components: [] });
        });
    }
};
