import { Board } from './Board.js';
import { Piece, SHAPES, COLORS } from './Piece.js';

export class Game {
    constructor(canvas, holdCanvas, nextCanvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.holdCanvas = holdCanvas;
        this.holdCtx = holdCanvas.getContext('2d');

        this.nextCanvas = nextCanvas;
        this.nextCtx = nextCanvas.getContext('2d');

        this.board = new Board(this.ctx);

        this.blockSize = 40; // Increased size

        // Game State
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;

        // Timing
        this.lastTime = 0;
        this.dropCounter = 0;
        this.dropInterval = 1000;

        // Input Handling (DAS/ARR)
        this.keys = {
            left: false,
            right: false,
            down: false,
            rotateCW: false,
            rotateCCW: false,
            hold: false
        };

        // Key timers
        this.dasDelay = 160; // ms to wait before auto-repeat starts
        this.arrDelay = 30;  // ms between auto-repeats

        this.leftTimer = 0;
        this.rightTimer = 0;
        this.downTimer = 0;
        this.downInterval = 50; // Soft drop speed

        // State to ensuring single press actions (like rotation) don't turbo
        this.prevKeys = { ...this.keys };

        // Pieces
        this.board.piece = null;
        this.board.nextPiece = null;
        this.board.holdPiece = null;
        this.canHold = true;

        this.animationId = null;

        this.bindInput();
        this.bindTouchControls(); // Initialize touch controls
    }

    bindTouchControls() {
        const btnLeft = document.getElementById('btn-left');
        const btnRight = document.getElementById('btn-right');
        const btnDown = document.getElementById('btn-down');
        const btnRotate = document.getElementById('btn-rotate');
        const btnHard = document.getElementById('btn-hard'); // Wait, I didn't add hard drop to HTML yet? I added it in HTML edit but not plan? Let's check HTML edit.
        // I added 'Btn-hard' in HTML with icon ⤓.
        const btnHold = document.getElementById('btn-hold');
        const btnPause = document.getElementById('btn-pause');

        // Helper to bind touchstart/touchend
        // We use 'touchstart' and 'touchend' for responsive continuous input (like holding down)
        // 'preventdefault' is crucial to stop scrolling/zooming double taps

        const bindBtn = (btn, key, isToggle = false) => {
            if (!btn) return;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (isToggle) {
                    // For pause/actions that are single triggers, we might want manual trigger
                    // But setKey handles state.
                    // For Pause, we specifically need to trigger toggle logic.
                    if (key === 'Space') {
                        this.togglePause();
                    } else {
                        // For others, set state true
                        this.setKey(key, true);
                    }
                } else {
                    this.setKey(key, true);
                }
            }, { passive: false });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                // If it's not a toggle like Pause (which handles itself on press), reset state
                if (key !== 'Space') {
                    this.setKey(key, false);
                }
            }, { passive: false });
        };

        bindBtn(btnLeft, 'ArrowLeft');
        bindBtn(btnRight, 'ArrowRight');
        bindBtn(btnDown, 'ArrowDown');

        // Rotate acts better as a tap, but setKey handles it as state.
        // My polling loop checks "if keys.rotate && !prevKeys.rotate".
        // So simple start/end works fine for tap.
        bindBtn(btnRotate, 'ArrowUp'); // I need to map this. My setKey doesn't have ArrowUp for rotate?
        // Game.js setKey: ] is rotateCW, [ is CCW. Up is not mapped.
        // I should map 'ArrowUp' to rotateCW for mobile/keyboard convenience if I want.
        // Or just map button to ']'.

        // Let's modify setKey to accept a new virtual key or just map here.
        // I'll map to ']' for CW.
        bindBtn(btnRotate, ']');

        bindBtn(btnHold, 'c');

        bindBtn(btnPause, 'Space', true);

        // Hard drop isn't in polling loop yet? 
        // Wait, loop has Left,Right,Down.
        // Where is Hard Drop?
        // Searching Game.js... I don't see Hard Drop in handleInput!
        // I might have missed implementing Hard Drop in the original pass or it was default key?
        // Let's check setKey/handleInput in next step.
    }

    bindInput() {
        window.addEventListener('keydown', (e) => {
            this.setKey(e.code, true);
            this.setKey(e.key, true); // For [ and ]
        });

        window.addEventListener('keyup', (e) => {
            this.setKey(e.code, false);
            this.setKey(e.key, false);
        });
    }

    setKey(key, state) {
        if (key === 'ArrowLeft') this.keys.left = state;
        if (key === 'ArrowRight') this.keys.right = state;
        if (key === 'ArrowDown') this.keys.down = state;
        if (key === ']') this.keys.rotateCW = state;
        if (key === '[') this.keys.rotateCCW = state;
        if (key === 'c' || key === 'C') this.keys.hold = state;

        // Toggle pause on KeyDown only
        if (key === 'Space' && state === true) {
            this.togglePause();
        }
    }

    togglePause() {
        if (this.gameOver) return;
        this.isPaused = !this.isPaused;

        const pauseOverlay = document.getElementById('pause-overlay');
        if (this.isPaused) {
            pauseOverlay.classList.remove('hidden');
            pauseOverlay.classList.add('active');
        } else {
            pauseOverlay.classList.remove('active');
            pauseOverlay.classList.add('hidden');
            this.lastTime = performance.now(); // Avoid huge delta jump
        }
    }

    handleInput(deltaTime) {
        const p = this.board.piece;
        if (!p) return;

        // --- Rotation (Trigger on press, not hold) ---
        if (this.keys.rotateCW && !this.prevKeys.rotateCW) {
            this.rotate(p, 1);
        }
        if (this.keys.rotateCCW && !this.prevKeys.rotateCCW) {
            this.rotate(p, -1);
        }

        // --- Hold ---
        if (this.keys.hold && !this.prevKeys.hold) {
            this.holdCurrentPiece();
            // Return early if we swapped, as piece might be different or null? 
            // Actually holdCurrentPiece spawns a new piece immediately if needed, so p ref might be stale.
            // But usually we just let the next frame handle it.
            return;
        }

        // --- Horizontal Movement (DAS + ARR) ---
        // If both pressed, usually prioritize the most recently pressed or cancel out.
        // For simplicity: Cancel out if both keys held, otherwise process.
        if (this.keys.left && this.keys.right) {
            // do nothing or maintain last direction? Let's do nothing.
            this.leftTimer = 0;
            this.rightTimer = 0;
        } else if (this.keys.left) {
            this.rightTimer = 0;
            if (!this.prevKeys.left) {
                // Initial Press
                this.move(p, -1, 0);
                this.leftTimer = 0;
            } else {
                // Holding
                this.leftTimer += deltaTime;
                if (this.leftTimer > this.dasDelay) {
                    // Move repeatedly every arrDelay
                    while (this.leftTimer > this.dasDelay + this.arrDelay) {
                        this.move(p, -1, 0);
                        this.leftTimer -= this.arrDelay;
                    }
                }
            }
        } else if (this.keys.right) {
            this.leftTimer = 0;
            if (!this.prevKeys.right) {
                this.move(p, 1, 0);
                this.rightTimer = 0;
            } else {
                this.rightTimer += deltaTime;
                if (this.rightTimer > this.dasDelay) {
                    while (this.rightTimer > this.dasDelay + this.arrDelay) {
                        this.move(p, 1, 0);
                        this.rightTimer -= this.arrDelay;
                    }
                }
            }
        } else {
            this.leftTimer = 0;
            this.rightTimer = 0;
        }

        // --- Soft Drop ---
        if (this.keys.down) {
            if (!this.prevKeys.down) {
                // Initial press
                this.drop(); // manual drop resets gravity timer in drop()
                this.downTimer = 0;
            } else {
                this.downTimer += deltaTime;
                if (this.downTimer > this.downInterval) {
                    while (this.downTimer > this.downInterval) {
                        this.drop();
                        this.downTimer -= this.downInterval;
                    }
                }
            }
        } else {
            this.downTimer = 0;
        }

        // Update prev keys at end of frame
        this.prevKeys = { ...this.keys };
    }

    move(p, dx, dy) {
        p.x += dx;
        p.y += dy;
        if (!this.board.isValid(p)) {
            p.x -= dx;
            p.y -= dy;
            return false; // Move failed
        }
        return true; // Move success
    }

    rotate(p, dir) {
        const clone = p.clone();

        if (dir > 0) clone.rotateCW();
        else clone.rotateCCW();

        if (this.board.isValid(clone)) {
            if (dir > 0) p.rotateCW(); else p.rotateCCW();
            return;
        }

        // Wall Kicks
        const kicks = [-1, 1, -2, 2];
        for (const k of kicks) {
            clone.x += k;
            if (this.board.isValid(clone)) {
                p.x += k;
                if (dir > 0) p.rotateCW(); else p.rotateCCW();
                return;
            }
            clone.x -= k;
        }
    }

    start() {
        this.reset();
        this.spawnPiece();
        this.animate();
    }

    reset() {
        this.board.reset();
        this.score = 0;
        this.lines = 0;
        this.level = 1;
        this.gameOver = false;
        this.isPaused = false;
        this.dropInterval = 1000;
        this.updateScore();
        this.board.holdPiece = null;
        this.canHold = true;

        // Reset pause overlay
        const pauseOverlay = document.getElementById('pause-overlay');
        if (pauseOverlay) {
            pauseOverlay.classList.remove('active');
            pauseOverlay.classList.add('hidden');
        }

        this.board.nextPiece = this.createPiece();
    }

    createPiece() {
        const typeId = Math.floor(Math.random() * 7) + 1;
        return new Piece(typeId);
    }

    spawnPiece() {
        this.board.piece = this.board.nextPiece;
        this.board.piece.x = 3;
        this.board.piece.y = 0;
        this.board.nextPiece = this.createPiece();
        this.canHold = true;

        if (!this.board.isValid(this.board.piece)) {
            this.gameOver = true;
            document.getElementById('game-over-overlay').classList.remove('hidden');
            document.getElementById('game-over-overlay').classList.add('active');
            document.getElementById('final-score').innerText = this.score;
            cancelAnimationFrame(this.animationId);
        }
    }

    holdCurrentPiece() {
        if (!this.canHold) return;

        if (!this.board.holdPiece) {
            this.board.holdPiece = this.board.piece;
            this.board.holdPiece.y = 0;
            this.spawnPiece();
        } else {
            const temp = this.board.piece;
            this.board.piece = this.board.holdPiece;
            this.board.holdPiece = temp;

            this.board.piece.y = 0;
            this.board.piece.x = 3;
            this.board.holdPiece.y = 0;
        }

        this.canHold = false;
    }

    drop() {
        const p = this.board.piece;
        p.y++;
        if (!this.board.isValid(p)) {
            p.y--;
            this.lock();
        }
        this.dropCounter = 0; // Reset gravity timer whenever we drop manually too
    }

    lock() {
        this.board.merge(this.board.piece);
        const cleared = this.board.clearLines();
        if (cleared > 0) {
            this.updateStats(cleared);
        }
        this.spawnPiece();
    }

    updateStats(linesCleared) {
        this.lines += linesCleared;
        const points = [0, 100, 300, 500, 800];
        this.score += points[linesCleared] * this.level;
        this.level = Math.floor(this.lines / 10) + 1;
        this.dropInterval = Math.max(100, 1000 - (this.level - 1) * 100);
        this.updateScore();
    }

    updateScore() {
        document.getElementById('score').innerText = this.score;
        document.getElementById('level').innerText = this.level;
    }

    update(deltaTime) {
        if (this.gameOver || this.isPaused) return;

        this.handleInput(deltaTime);

        this.dropCounter += deltaTime;
        if (this.dropCounter > this.dropInterval) {
            this.drop();
        }
    }

    draw() {
        this.ctx.fillStyle = '#050510';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawGrid(this.ctx, this.board.grid);
        if (this.board.piece) {
            this.drawPiece(this.ctx, this.board.piece);
        }

        this.nextCtx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        if (this.board.nextPiece) {
            this.drawPreview(this.nextCtx, this.board.nextPiece);
        }

        this.holdCtx.clearRect(0, 0, this.holdCanvas.width, this.holdCanvas.height);
        if (this.board.holdPiece) {
            this.drawPreview(this.holdCtx, this.board.holdPiece);
        }
    }

    drawPreview(ctx, piece) {
        const size = 20;
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(ctx, x + 1, y + 1, value, size);
                }
            });
        });
    }

    drawGrid(ctx, grid) {
        grid.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(ctx, x, y, value, this.blockSize);
                }
            });
        });
    }

    drawPiece(ctx, piece) {
        piece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value > 0) {
                    this.drawBlock(ctx, piece.x + x, piece.y + y, value, this.blockSize);
                }
            });
        });
    }

    drawBlock(ctx, x, y, typeId, size) {
        const color = COLORS[typeId];
        ctx.fillStyle = color;
        ctx.fillRect(x * size, y * size, size, size);

        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * size, y * size, size, size);
    }

    animate(time = 0) {
        const deltaTime = time - this.lastTime;
        this.lastTime = time;

        this.update(deltaTime);
        this.draw();

        this.animationId = requestAnimationFrame(this.animate.bind(this));
    }
}
