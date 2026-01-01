console.log('Tetris Main Loaded');

// We will implement the Game class next.
// For now, let's just make sure we can select elements.



document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const holdCanvas = document.getElementById('hold-canvas');
    const nextCanvas = document.getElementById('next-canvas');

    if (canvas && holdCanvas && nextCanvas) {
        const game = new Game(canvas, holdCanvas, nextCanvas);

        // Bind buttons
        document.getElementById('start-btn').addEventListener('click', () => {
            game.start();
            document.getElementById('start-overlay').classList.remove('active');
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            document.getElementById('game-over-overlay').classList.remove('active'); // Hide game over
            game.reset(); // Reset game state
            game.start(); // Start new game
        });
    }
});
