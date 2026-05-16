const DIFFICULTY = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

let currentDifficulty = 'easy';
let board = [];
let gameState = 'waiting';
let timer = 0;
let timerInterval = null;
let mineCount = 0;
let flagCount = 0;

function initGame() {
    const config = DIFFICULTY[currentDifficulty];
    board = [];
    gameState = 'waiting';
    timer = 0;
    flagCount = 0;
    mineCount = config.mines;
    
    stopTimer();
    updateTimerDisplay();
    updateMineCount();
    updateStatus('点击格子开始游戏', 'waiting');
    updateResetButton('😊');
    
    createBoard(config.rows, config.cols);
}

function createBoard(rows, cols) {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    
    for (let r = 0; r < rows; r++) {
        board[r] = [];
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        
        for (let c = 0; c < cols; c++) {
            board[r][c] = {
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0
            };
            
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.addEventListener('click', handleClick);
            cell.addEventListener('contextmenu', handleRightClick);
            cell.addEventListener('dblclick', handleDoubleClick);
            rowDiv.appendChild(cell);
        }
        
        gameBoard.appendChild(rowDiv);
    }
}

function handleClick(e) {
    if (gameState === 'won' || gameState === 'lost') return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    if (board[row][col].isFlagged || board[row][col].isRevealed) return;
    
    if (gameState === 'waiting') {
        startGame(row, col);
    }
    
    revealCell(row, col);
    checkWin();
}

function handleRightClick(e) {
    e.preventDefault();
    if (gameState === 'won' || gameState === 'lost') return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    if (board[row][col].isRevealed) return;
    
    if (board[row][col].isFlagged) {
        board[row][col].isFlagged = false;
        flagCount--;
        e.target.textContent = '';
        e.target.classList.remove('flagged');
    } else {
        board[row][col].isFlagged = true;
        flagCount++;
        e.target.textContent = '🚩';
        e.target.classList.add('flagged');
    }
    
    updateMineCount();
}

function handleDoubleClick(e) {
    if (gameState !== 'playing') return;
    
    const row = parseInt(e.target.dataset.row);
    const col = parseInt(e.target.dataset.col);
    
    if (!board[row][col].isRevealed || board[row][col].neighborMines === 0) return;
    
    const neighbors = getNeighbors(row, col);
    let flagCount = 0;
    
    neighbors.forEach(([nr, nc]) => {
        if (board[nr][nc].isFlagged) flagCount++;
    });
    
    if (flagCount === board[row][col].neighborMines) {
        neighbors.forEach(([nr, nc]) => {
            if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) {
                revealCell(nr, nc);
            }
        });
        checkWin();
    }
}

function startGame(excludeRow, excludeCol) {
    gameState = 'playing';
    updateStatus('游戏进行中...', 'playing');
    startTimer();
    
    const config = DIFFICULTY[currentDifficulty];
    let minesPlaced = 0;
    
    while (minesPlaced < config.mines) {
        const r = Math.floor(Math.random() * config.rows);
        const c = Math.floor(Math.random() * config.cols);
        
        if (!board[r][c].isMine && 
            Math.abs(r - excludeRow) <= 1 && 
            Math.abs(c - excludeCol) <= 1) continue;
        
        if (!board[r][c].isMine) {
            board[r][c].isMine = true;
            minesPlaced++;
        }
    }
    
    calculateNeighborMines();
}

function calculateNeighborMines() {
    const config = DIFFICULTY[currentDifficulty];
    
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            if (board[r][c].isMine) continue;
            
            const neighbors = getNeighbors(r, c);
            let count = 0;
            
            neighbors.forEach(([nr, nc]) => {
                if (board[nr][nc].isMine) count++;
            });
            
            board[r][c].neighborMines = count;
        }
    }
}

function getNeighbors(row, col) {
    const config = DIFFICULTY[currentDifficulty];
    const neighbors = [];
    
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            
            const nr = row + dr;
            const nc = col + dc;
            
            if (nr >= 0 && nr < config.rows && nc >= 0 && nc < config.cols) {
                neighbors.push([nr, nc]);
            }
        }
    }
    
    return neighbors;
}

function revealCell(row, col) {
    if (board[row][col].isRevealed || board[row][col].isFlagged) return;
    
    board[row][col].isRevealed = true;
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.classList.add('revealed');
    
    if (board[row][col].isMine) {
        cell.textContent = '💣';
        cell.classList.add('mine-revealed');
        gameOver(false);
        return;
    }
    
    if (board[row][col].neighborMines > 0) {
        cell.textContent = board[row][col].neighborMines;
        cell.classList.add(`number-${board[row][col].neighborMines}`);
    } else {
        const neighbors = getNeighbors(row, col);
        neighbors.forEach(([nr, nc]) => {
            if (!board[nr][nc].isRevealed && !board[nr][nc].isFlagged) {
                revealCell(nr, nc);
            }
        });
    }
}

function checkWin() {
    const config = DIFFICULTY[currentDifficulty];
    let revealedCount = 0;
    
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            if (board[r][c].isRevealed) revealedCount++;
        }
    }
    
    if (revealedCount === config.rows * config.cols - config.mines) {
        gameOver(true);
    }
}

function gameOver(won) {
    gameState = won ? 'won' : 'lost';
    stopTimer();
    
    if (won) {
        updateStatus('🎉 恭喜你赢了！', 'won');
        updateResetButton('😎');
    } else {
        updateStatus('💥 游戏结束！', 'lost');
        updateResetButton('😵');
        revealAllMines();
    }
}

function revealAllMines() {
    const config = DIFFICULTY[currentDifficulty];
    
    for (let r = 0; r < config.rows; r++) {
        for (let c = 0; c < config.cols; c++) {
            if (board[r][c].isMine) {
                const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
                cell.textContent = '💣';
                cell.classList.add('revealed', 'mine-revealed');
            }
        }
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        timer++;
        updateTimerDisplay();
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    document.getElementById('timeCount').textContent = timer;
}

function updateMineCount() {
    document.getElementById('mineCount').textContent = mineCount - flagCount;
}

function updateStatus(text, state) {
    const status = document.getElementById('status');
    status.textContent = text;
    status.className = `status ${state}`;
}

function updateResetButton(emoji) {
    document.getElementById('resetBtn').textContent = emoji;
}

function resetGame() {
    initGame();
}

document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.difficulty;
        initGame();
    });
});

initGame();