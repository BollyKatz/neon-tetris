import { Piece } from './Piece.js';

export class Board {
    constructor(ctx) {
        this.ctx = ctx;
        this.grid = this.getEmptyGrid();
        this.piece = null;
        this.nextPiece = null;
        this.holdPiece = null;
    }

    getEmptyGrid() {
        // 20 rows, 10 cols
        return Array.from({ length: 20 }, () => Array(10).fill(0));
    }

    reset() {
        this.grid = this.getEmptyGrid();
    }

    isValid(p) {
        // p has x,y and shape
        for (let y = 0; y < p.shape.length; y++) {
            for (let x = 0; x < p.shape[y].length; x++) {
                if (p.shape[y][x] > 0) {
                    const newX = p.x + x;
                    const newY = p.y + y;

                    // Check bounds
                    if (newX < 0 || newX >= 10 || newY >= 20) {
                        return false;
                    }

                    // Check collision with grid (ignore if above board, though usually we start y=0)
                    if (newY >= 0 && this.grid[newY][newX] > 0) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    merge(p) {
        for (let y = 0; y < p.shape.length; y++) {
            for (let x = 0; x < p.shape[y].length; x++) {
                if (p.shape[y][x] > 0) {
                    // If y is negative (above board), it's game over
                    if (p.y + y < 0) {
                        // Game Over handled by caller usually, but let's clamp safely?
                        // No, if we merge above board, we modify nothing but it indicates overflow.
                        continue;
                    }
                    this.grid[p.y + y][p.x + x] = p.typeId;
                }
            }
        }
    }

    clearLines() {
        let lines = 0;

        // Filter out full rows
        // A row is full if every cell > 0
        const newGrid = this.grid.filter(row => row.some(value => value === 0));
        lines = 20 - newGrid.length;

        // Unshift new empty rows at the top
        for (let i = 0; i < lines; i++) {
            newGrid.unshift(Array(10).fill(0));
        }

        this.grid = newGrid;
        return lines;
    }
}
