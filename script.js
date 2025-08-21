const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const nextPieceCanvas = document.getElementById('next-piece-canvas');
const nextPieceContext = nextPieceCanvas.getContext('2d');
const gameOverModal = document.getElementById('game-over-modal');
const restartButton = document.getElementById('restart-button');
const music = document.getElementById('background-music');
const muteMusicButton = document.getElementById('mute-music-button');
const muteSfxButton = document.getElementById('mute-sfx-button');
const moveSound = document.getElementById('move-sound');
const rotateSound = document.getElementById('rotate-sound');
const dropSound = document.getElementById('drop-sound');
const lineClearSound = document.getElementById('line-clear-sound');
const gameOverSound = document.getElementById('game-over-sound');
const pauseOverlay = document.getElementById('pause-overlay');

const sfx = [moveSound, rotateSound, dropSound, lineClearSound, gameOverSound];

let gameOver = false;
let musicStarted = false;
let paused = false;

function setupCanvas(canvas, context, columns) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const scale = (canvas.width / columns) / dpr;
    context.setTransform(dpr, 0, 0, dpr, 0, 0); // Reset transform and apply DPR
    context.scale(scale, scale);
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y > 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        arena.unshift(row);
        ++y;

        player.score += rowCount * 10;
        rowCount *= 2;
        lineClearSound.play();
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
                (arena[y + o.y] &&
                    arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset, drawContext) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawContext.fillStyle = colors[value];
                drawContext.fillRect(x + offset.x,
                    y + offset.y,
                    1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, { x: 0, y: 0 }, context);
    drawMatrix(player.matrix, player.pos, context);
    drawNextPiece();
}

function drawNextPiece() {
    nextPieceContext.fillStyle = '#000';
    nextPieceContext.fillRect(0, 0, nextPieceCanvas.width, nextPieceCanvas.height);

    if (player.nextMatrix) {
        const matrix = player.nextMatrix;
        const offset = {
            x: (6 - matrix[0].length) / 2,
            y: (6 - matrix.length) / 2,
        };
        drawMatrix(matrix, offset, nextPieceContext);
    }
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                arena[y + player.pos.y][x + player.pos.x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [matrix[x][y],
                matrix[y][x],
            ] = [
                    matrix[y][x],
                    matrix[x][y],
                ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    if (gameOver || paused) return;
    player.pos.y++;
    if (collide(arena, player)) {
        player.pos.y--;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
        dropSound.play();
    }
    dropCounter = 0;
}

function playerMove(offset) {
    if (gameOver || paused) return;
    player.pos.x += offset;
    if (collide(arena, player)) {
        player.pos.x -= offset;
    }
    moveSound.play();
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    if (player.nextMatrix === null) {
        player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    } else {
        player.matrix = player.nextMatrix;
    }
    player.nextMatrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = 0;
    player.pos.x = (arena[0].length / 2 | 0) - (player.matrix[0].length / 2 | 0);

    if (collide(arena, player)) {
        gameOver = true;
        const modal = document.getElementById('game-over-modal');
        const message = modal.querySelector('h2');
        message.innerText = 'Game Over';
        modal.style.display = 'flex';
        music.pause();
        gameOverSound.play();
    }
}

function playerRotate(dir) {
    if (gameOver || paused) return;
    const pos = player.pos.x;
    rotate(player.matrix, dir);
    if (collide(arena, player)) {
        rotate(player.matrix, -dir);
    }
    rotateSound.play();
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;
function update(time = 0) {
    if (!gameOver && !paused) {
        const deltaTime = time - lastTime;
        lastTime = time;

        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
    }

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
    const newLevel = Math.floor(player.score / 500) + 1;
    if (newLevel > player.level) {
        player.level = newLevel;
        updateLevel();
        if (player.level <= 10) {
            // Speed increases by 50% of the initial speed for each level.
            // Speed is inversely proportional to dropInterval.
            // newInterval = initialInterval / (1 + (level - 1) * 0.5)
            dropInterval = 1000 / (1 + (player.level - 1) * 0.5);
        }
    }

    if (player.level > 10) {
        gameOver = true;
        const modal = document.getElementById('game-over-modal');
        const message = modal.querySelector('h2');
        message.innerText = 'You Win!';
        modal.style.display = 'flex';
        music.pause();
    }
}

function updateLevel() {
    document.getElementById('level').innerText = player.level;
}

function restartGame() {
    gameOver = false;
    paused = false;
    pauseOverlay.style.display = 'none';
    arena.forEach(row => row.fill(0));
    player.score = 0;
    player.level = 1;
    dropInterval = 1000;
    updateScore();
    updateLevel();
    playerReset();
    gameOverModal.style.display = 'none';
    music.play();
}

function startGame() {
    if (!musicStarted) {
        music.play();
        musicStarted = true;
    }
}

function togglePause() {
    paused = !paused;
    if (paused) {
        pauseOverlay.style.display = 'flex';
        music.pause();
    } else {
        pauseOverlay.style.display = 'none';
        music.play();
    }
}

window.addEventListener('resize', () => {
    setupCanvas(canvas, context, 12);
    setupCanvas(nextPieceCanvas, nextPieceContext, 6);
    draw();
});

document.getElementById('left').addEventListener('click', () => {
    startGame();
    playerMove(-1);
});
document.getElementById('right').addEventListener('click', () => {
    startGame();
    playerMove(1);
});
document.getElementById('rotate').addEventListener('click', () => {
    startGame();
    playerRotate(1);
});
document.getElementById('down').addEventListener('click', () => {
    startGame();
    playerDrop();
});
restartButton.addEventListener('click', restartGame);
muteMusicButton.addEventListener('click', () => {
    if (music.muted) {
        music.muted = false;
        muteMusicButton.innerText = 'Mute Music';
    } else {
        music.muted = true;
        muteMusicButton.innerText = 'Unmute Music';
    }
});
muteSfxButton.addEventListener('click', () => {
    sfx.forEach(sound => {
        sound.muted = !sound.muted;
    });
    if (sfx[0].muted) {
        muteSfxButton.innerText = 'Unmute SFX';
    } else {
        muteSfxButton.innerText = 'Mute SFX';
    }
});


document.addEventListener('keydown', event => {
    if (event.keyCode === 32) { // Space
        togglePause();
    }
    startGame();
    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 81) {
        playerRotate(-1);
    } else if (event.keyCode === 87) {
        playerRotate(1);
    }
});

const colors = [
    null,
    '#FF0D72',
    '#0DC2FF',
    '#0DFF72',
    '#F538FF',
    '#FF8E0D',
    '#FFE138',
    '#3877FF',
];

const arena = createMatrix(12, 20);

const player = {
    pos: { x: 0, y: 0 },
    matrix: null,
    score: 0,
    level: 1,
    nextMatrix: null,
};

setupCanvas(canvas, context, 12);
setupCanvas(nextPieceCanvas, nextPieceContext, 6);
playerReset();
updateScore();
updateLevel();
update();
startGame();