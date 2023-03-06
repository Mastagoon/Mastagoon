export type Game = {
	board: Board,
	ownerColor: "r" | "y",
	turn: "r" | "y",
	state: GameStatus
}
export type Board = Row[]
export type Row = Cell[]
export type Cell = "e" | "y" | "r"

export type GameStatus = {
	status: "IN_PROGRESS" | "WINNER_RED" | "WINNER_YELLOW" | "TIE" | "INVALID",
	lastMove?: number[]
	winner?: "r" | "y"
	winningCoords?: number[][]
}

let NUM_COLS = 7
let NUM_ROWS = 6

function isRowValid(row: Row) {
	if (row.length !== NUM_ROWS) return false
	return true
}

function isBoardValid(board: Board) {
	if (board.length !== NUM_COLS) return false
	for (let i = 0; i < board.length; i++) if (!isRowValid(board[i])) return false

	return true
}


export function createEmptyBoard(): Board {
	//#TODO clean me
	const rows: Row[] = Array(NUM_ROWS).fill("e")
	// ["e", "e", "e", "e", "e", "e"]
	return Array(NUM_COLS).fill(rows)
}


function winningCoordsForCell(x: number, y: number): number[][][] {
	let straightUp = [[x, y], [x, y + 1], [x, y + 2], [x, y + 3]]
	let topRight = [[x, y], [x + 1, y + 1], [x + 2, y + 2], [x + 3, y + 3]]
	let straightRight = [[x, y], [x + 1, y], [x + 2, y], [x + 3, y]]
	let bottomRight = [[x, y], [x + 1, y - 1], [x + 2, y - 2], [x + 3, y - 3]]
	let straightDown = [[x, y], [x, y - 1], [x, y - 2], [x, y - 3]]
	let bottomLeft = [[x, y], [x - 1, y - 1], [x - 2, y - 2], [x - 3, y - 3]]
	let straightLeft = [[x, y], [x - 1, y], [x - 2, y], [x - 3, y]]
	let topLeft = [[x, y], [x - 1, y + 1], [x - 2, y + 2], [x - 3, y + 3]]

	return [
		straightUp, topRight, straightRight, bottomRight,
		straightDown, bottomLeft, straightLeft, topLeft
	]
}

function isCellInBoard(coords: number[]) {
	if (coords.length !== 2) return false
	if (coords[0] < 0 || coords[0] >= NUM_ROWS) return false
	if (coords[1] < 0 || coords[1] >= NUM_COLS) return false
	return true
}

function validateCoords(coords: number[][]) {
	return coords.every(isCellInBoard)
}

function validateWinningDirections(winningDirections: number[][][]) {
	return winningDirections.filter(validateCoords)
}


// given a board and a coordinate, check if there is a winning combination
// on the coordinate squares
// returns 'r', 'y', or null
function isCoordListWinning(board: Board, coord: number[][]) {
	let c0 = coord[0]
	let c1 = coord[1]
	let c2 = coord[2]
	let c3 = coord[3]

	let x0 = c0[0]
	let x1 = c1[0]
	let x2 = c2[0]
	let x3 = c3[0]

	let y0 = c0[1]
	let y1 = c1[1]
	let y2 = c2[1]
	let y3 = c3[1]

	if (board[x0][y0] === 'r' &&
		board[x1][y1] === 'r' &&
		board[x2][y2] === 'r' &&
		board[x3][y3] === 'r') {
		return 'r'
	}

	if (board[x0][y0] === 'y' &&
		board[x1][y1] === 'y' &&
		board[x2][y2] === 'y' &&
		board[x3][y3] === 'y') {
		return 'y'
	}

	return null
}

function getWinningDirections(board: Board): number[][][][] {
	let winningDirectionsCoords: number[][][][] = []

	// generate all possible coordinates
	board.forEach((row, colIdx) => {
		row.forEach((_, rowIdx) => {
			// fill array with [[directions1] [driections2...]]
			// where directions is [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
			winningDirectionsCoords.push(winningCoordsForCell(colIdx, rowIdx))
		})
	})

	// get valid coords only
	return winningDirectionsCoords.map(validateWinningDirections)
}

export function getGameState(board: Board): GameStatus {
	// return null if a valid board was not passed in
	if (!isBoardValid(board)) return { status: "INVALID" }

	// check for any winners
	let allPossibleWinningCoords = getWinningDirections(board)
	for (let i = 0; i < allPossibleWinningCoords.length; i++) {
		const directionSet = allPossibleWinningCoords[i]
		for (let j = 0; j < directionSet.length; j++) {
			const coord = directionSet[j]
			const result = isCoordListWinning(board, coord)

			if (result === "r")
				return { status: "WINNER_RED", winningCoords: coord }

			if (result === "y")
				return { status: "WINNER_YELLOW", winningCoords: coord }
		}
	}

	// if there are no winners and the board is full, return a tie
	if (isBoardFull(board))
		return { status: "TIE" }

	return { status: "IN_PROGRESS" }
}

export function isBoardFull(board: Board) {
	for (let colIdx = 0; colIdx < board.length; colIdx++) {
		for (let rowIdx = 0; rowIdx < board[colIdx].length; rowIdx++) {
			if (board[colIdx][rowIdx] === "e") {
				return false
			}
		}
	}

	return true
}

export function addToBoard(board: Board, colIdx: number, color: "y" | "r"): Board | null {
	const rowIdx = board[colIdx]?.lastIndexOf("e")
	if (rowIdx === -1 || rowIdx === undefined) return null
	board[colIdx][rowIdx] = color
	return board
}
