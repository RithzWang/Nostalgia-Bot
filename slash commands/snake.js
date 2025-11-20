const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ComponentType
} = require('discord.js');
const { createCanvas } = require('@napi-rs/canvas');

// Game Settings
const GRID_SIZE = 20; // Size of one square in pixels
const COLS = 20;      // Width of the board (cells)
const ROWS = 15;      // Height of the board (cells)
const WIDTH = COLS * GRID_SIZE;
const HEIGHT = ROWS * GRID_SIZE;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snake')
        .setDescription('Play a game of Snake using Discord Buttons!'),

    async execute(interaction) {
        await interaction.deferReply();

        // --- GAME STATE ---
        let snake = [{ x: 5, y: 5 }]; // Head is at index 0
        let score = 0;
        let food = spawnFood(snake);
        let isGameOver = false;

        // Function: Spawn Food (ensure it doesn't spawn on snake body)
        function spawnFood(snakeBody) {
            let newFood;
            let valid = false;
            while (!valid) {
                newFood = {
                    x: Math.floor(Math.random() * COLS),
                    y: Math.floor(Math.random() * ROWS)
                };
                // Check if food is on snake
                const collision = snakeBody.some(segment => segment.x === newFood.x && segment.y === newFood.y);
                if (!collision) valid = true;
            }
            return newFood;
        }

        // Function: Draw the Game Board
        const drawGame = async (gameOver = false) => {
            const canvas = createCanvas(WIDTH, HEIGHT);
            const ctx = canvas.getContext('2d');

            // 1. Background
            ctx.fillStyle = '#2B2D31'; // Discord Dark Grey
            ctx.fillRect(0, 0, WIDTH, HEIGHT);

            // 2. Grid Lines (Optional, for retro look)
            ctx.strokeStyle = '#383A40';
            ctx.lineWidth = 1;
            for (let i = 0; i <= COLS; i++) {
                ctx.beginPath();
                ctx.moveTo(i * GRID_SIZE, 0);
                ctx.lineTo(i * GRID_SIZE, HEIGHT);
                ctx.stroke();
            }
            for (let i = 0; i <= ROWS; i++) {
                ctx.beginPath();
                ctx.moveTo(0, i * GRID_SIZE);
                ctx.lineTo(WIDTH, i * GRID_SIZE);
                ctx.stroke();
            }

            // 3. Draw Food (Red Apple)
            ctx.fillStyle = '#ED4245'; // Discord Red
            ctx.beginPath();
            const foodX = food.x * GRID_SIZE + (GRID_SIZE / 2);
            const foodY = food.y * GRID_SIZE + (GRID_SIZE / 2);
            ctx.arc(foodX, foodY, GRID_SIZE / 2.5, 0, Math.PI * 2);
            ctx.fill();

            // 4. Draw Snake (Green)
            ctx.fillStyle = gameOver ? '#5c5c5c' : '#57F287'; // Grey if dead, Green if alive
            snake.forEach((segment, index) => {
                // Draw square slightly smaller than grid for "segment" look
                ctx.fillRect(
                    segment.x * GRID_SIZE + 1, 
                    segment.y * GRID_SIZE + 1, 
                    GRID_SIZE - 2, 
                    GRID_SIZE - 2
                );
                
                // Draw Eyes on Head
                if (index === 0) {
                    ctx.fillStyle = '#000000';
                    // Simplified eyes based on generic position
                    ctx.fillRect(segment.x * GRID_SIZE + 4, segment.y * GRID_SIZE + 4, 4, 4);
                    ctx.fillRect(segment.x * GRID_SIZE + 12, segment.y * GRID_SIZE + 4, 4, 4);
                    ctx.fillStyle = gameOver ? '#5c5c5c' : '#57F287'; // Reset color
                }
            });

            // 5. Draw Score
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillText(`Score: ${score}`, 10, 25);

            // 6. Game Over Overlay
            if (gameOver) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fillRect(0, 0, WIDTH, HEIGHT);
                
                ctx.fillStyle = '#ED4245';
                ctx.font = 'bold 40px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText("GAME OVER", WIDTH / 2, HEIGHT / 2);
                
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '20px sans-serif';
                ctx.fillText(`Final Score: ${score}`, WIDTH / 2, HEIGHT / 2 + 30);
            }

            return new AttachmentBuilder(await canvas.encode('png'), { name: 'snake.png' });
        };

        // --- BUTTON LAYOUT ---
        // We need a D-Pad layout.
        // Row 1: [Blank] [Up] [Blank]
        // Row 2: [Left] [Down] [Right]
        // Row 3: [Stop]

        const getButtons = (disabled = false) => {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('none1').setLabel('⬛').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('up').setEmoji('⬆️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('none2').setLabel('⬛').setStyle(ButtonStyle.Secondary).setDisabled(true),
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('left').setEmoji('⬅️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('down').setEmoji('⬇️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('right').setEmoji('➡️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
            );
            const row3 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('stop').setLabel('End Game').setStyle(ButtonStyle.Danger).setDisabled(disabled)
            );
            return [row1, row2, row3];
        };

        // --- INITIAL SEND ---
        let attachment = await drawGame();
        const embed = new EmbedBuilder()
            .setTitle('🐍 Snake')
            .setDescription('Click the buttons to move the snake.\nDon\'t hit the walls or yourself!')
            .setColor('#57F287')
            .setImage('attachment://snake.png');

        const response = await interaction.editReply({ 
            embeds: [embed], 
            files: [attachment],
            components: getButtons() 
        });

        // --- GAME LOOP (COLLECTOR) ---
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 300000 // 5 Minutes
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: "This isn't your game!", ephemeral: true });
            }

            if (i.customId === 'stop') {
                isGameOver = true;
                collector.stop();
                return;
            }

            // 1. Determine Move Direction
            let dx = 0;
            let dy = 0;
            if (i.customId === 'up') dy = -1;
            if (i.customId === 'down') dy = 1;
            if (i.customId === 'left') dx = -1;
            if (i.customId === 'right') dx = 1;

            // 2. Calculate New Head Position
            const head = snake[0];
            const newHead = { x: head.x + dx, y: head.y + dy };

            // 3. Check Collisions (Walls)
            if (newHead.x < 0 || newHead.x >= COLS || newHead.y < 0 || newHead.y >= ROWS) {
                isGameOver = true;
                collector.stop("wall_collision");
                return; // Stop processing this move
            }

            // 4. Check Collisions (Self)
            // We ignore the very last tail segment because it will move away in this frame
            const hitSelf = snake.some((seg, index) => {
                if (index === snake.length - 1) return false; 
                return seg.x === newHead.x && seg.y === newHead.y;
            });
            
            if (hitSelf) {
                isGameOver = true;
                collector.stop("self_collision");
                return;
            }

            // 5. Move Snake
            snake.unshift(newHead); // Add new head

            // 6. Check Food
            if (newHead.x === food.x && newHead.y === food.y) {
                score++;
                food = spawnFood(snake); // Spawn new food
                // Don't pop the tail, so snake grows
            } else {
                snake.pop(); // Remove tail to maintain size
            }

            // 7. Update Message
            const newAttachment = await drawGame();
            // We use update() because it's faster and cleaner for buttons
            await i.update({ 
                files: [newAttachment]
            });
        });

        collector.on('end', async (_, reason) => {
            // Final Draw (Game Over Screen)
            const finalAttachment = await drawGame(true);
            const finalEmbed = new EmbedBuilder()
                .setTitle('🐍 Game Over')
                .setDescription(`**Final Score:** ${score}\nReason: ${reason === 'time' ? 'Time limit reached' : 'Crashed!'}`)
                .setColor('#ED4245')
                .setImage('attachment://snake.png');

            try {
                await interaction.editReply({ 
                    embeds: [finalEmbed], 
                    files: [finalAttachment], 
                    components: getButtons(true) // Disable buttons
                });
            } catch (e) {
                console.log("Message deleted or unavailable.");
            }
        });
    },
};
