class Piece {
    constructor(typeId) {
        this.typeId = typeId;
        this.shape = SHAPES[typeId];
        this.color = COLORS[typeId];
        this.x = 0; // Initialize at 0, will be centered by Board
        this.y = 0;
    }

    // Deep copy for immutability during rotation checks
    clone() {
        const p = new Piece(this.typeId);
        p.shape = JSON.parse(JSON.stringify(this.shape));
        p.x = this.x;
        p.y = this.y;
        return p;
    }

    rotate(direction) {
        // direction: 1 = CW, -1 = CCW
        // Transpose
        for (let y = 0; y < this.shape.length; ++y) {
            for (let x = 0; x < y; ++x) {
                [this.shape[x][y], this.shape[y][x]] = [this.shape[y][x], this.shape[x][y]];
            }
        }

        // Reverse rows for CW
        if (direction > 0) {
            this.shape.forEach(row => row.reverse());
        } else {
            // For CCW, reverse columns (which is trickier after transpose) 
            // Actually standard matrix rotation:
            // CW: Transpose + Reverse Rows
            // CCW: Transpose + Reverse Columns (or Reverse Rows + Transpose)

            // Let's stick to a simpler method: 
            // CW is Transpose then Reverse Rows.
            // If we want CCW from the original state, we can rotate CW 3 times.
            // Or: Reverse Rows then Transpose is CCW.

            // Let's redo:
            // Since I already transposed above, "reverse rows" makes it CW.
            // If I want CCW, I should have reversed rows BEFORE transpose (or reverse columns after).

            // But wait, the previous code block executed Transpose already.
            // So if direction > 0 (CW), Reverse Rows.
            // If direction < 0 (CCW), we need to reverse COLUMNS.
            // Reversing columns in a 2D array `shape` means `shape.reverse()` effectively reverses the rows order (top to bottom), 
            // preventing "Reverse Rows" (left to right).

            // Actually simpler: 
            // CW: Transpose -> Reverse each row.
            // CCW: Reverse each row -> Transpose.

            // But I already transposed.
            // Let's Undo the transpose if it was CCW and do the correct order? No, that's messy.

            // Let's just implement CW. 3 CWs = 1 CCW.
            // But user specifically asked for [ and ].

            // Correct CCW algorithm on matrix M:
            // M_new[x][y] = M[last - y][x]

            // Let's just replace the logic with a new matrix generation to be safe and clean.
        }
    }

    // Better rotation method using new matrix
    rotateCW() {
        const N = this.shape.length;
        const newShape = Array.from({ length: N }, () => Array(N).fill(0));
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                newShape[x][N - 1 - y] = this.shape[y][x];
            }
        }
        this.shape = newShape;
    }

    rotateCCW() {
        const N = this.shape.length;
        const newShape = Array.from({ length: N }, () => Array(N).fill(0));
        for (let y = 0; y < N; y++) {
            for (let x = 0; x < N; x++) {
                newShape[N - 1 - x][y] = this.shape[y][x];
            }
        }
        this.shape = newShape;
    }
}

const SHAPES = [
    [], // Empty 0
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // I
    [[2, 0, 0], [2, 2, 2], [0, 0, 0]], // J
    [[0, 0, 3], [3, 3, 3], [0, 0, 0]], // L
    [[0, 4, 4], [4, 4, 0], [0, 0, 0]], // O -> Actually O is 2x2 but usually fits in 4x4 or 3x3. Standard is 2x2 but centered. Let's use 2x2.
    // Actually O should not rotate.
    [[0, 5, 5], [5, 5, 0], [0, 0, 0]], // S -- this is actually S? No, this is S.
    [[0, 6, 0], [6, 6, 6], [0, 0, 0]], // T
    [[7, 7, 0], [0, 7, 7], [0, 0, 0]]  // Z
];

// Correcting SHAPES for standard Tetris bounding boxes if needed.
// O piece
SHAPES[4] = [[4, 4], [4, 4]];

const COLORS = [
    'none',
    '#00f3ff', // I - Cyan
    '#0000ff', // J - Blue (Making it brighter for neon: #1e1eff)
    '#ffaa00', // L - Orange
    '#ffea00', // O - Yellow
    '#00ff00', // S - Green
    '#ff00ff', // T - Purple
    '#ff0000'  // Z - Red
];

// Premium Neon Palette Overrides
COLORS[2] = '#2b65ff'; // J brighter Blue
COLORS[5] = '#00ff9d'; // S Neon Green
COLORS[7] = '#ff0055'; // Z Neon Red
