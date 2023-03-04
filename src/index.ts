import fs from "fs"
import dotenv from "dotenv"
import { addToBoard, Board, createEmptyBoard, Game, GameStatus, getGameState } from "./lib/connect4"
import { getIssue, replyToIssue } from "./api/github"

const REPO_NAME = "readme-connect4"

dotenv.config()

const TEMPLATE_PATH = "./template.md"

const getGame = (): Game => {
	const boardFile = fs.readFileSync("./data/game.json", "utf-8")
	return JSON.parse(boardFile) as Game
}

const createIssueCommentLink = (column: number) => {
	const owner = process.env.REPOSITORY_OWNER
	return `https://github.com/${owner}/${REPO_NAME}/issues/new?body=You+do+not+need+to+change+this+message,+just+submit+to+Play&title=Connect4:+move:+${column}`
}

const generateReadmeBoard = (board: Board) => {
	const header = "| | | | | | | |"
	const separator = "|:---:|:---:|:---:|:---:|:---:|:---:|:---:|"
	// transpose the board array #fixme
	const transposedBoard = board[0].map((_, colIndex) => board.map((row) => row[colIndex]))
	const rows = transposedBoard.map((row) => {
		const cells = row.map((cell) => `| <img src="imgs/${cell}.png" width="50" height="50" /> `)
		return `${cells.join("")}|`
	})
	const arr = Array.from(Array(7).keys())
	const tail = ` ${arr.map((i) => `| [${i + 1}](${createIssueCommentLink(i + 1)}) `).join("")}|`
	return [header, separator, ...rows, tail].join("\n")
}

const generateReadmeTurnMessage = (ownerTurn: boolean, color: "y" | "r") => {
	if (ownerTurn) return `It's ${process.env.REPOSITORY_OWNER}'s turn! He is playing as <img src="imgs/${color}.png" width="15" height="15" />`
	return `It's your turn! You are playing as <img src="imgs/${color}.png" width="15" height="15" />`
}

const updateReadme = (game: Game) => {
	const template = fs.readFileSync(TEMPLATE_PATH, "utf-8")
	const turnMessageDelimiter = "<!-- turn message here -->"
	const [beforeTurnMessage, afterTurnMessage] = template.split(turnMessageDelimiter)
	const turnMessage = generateReadmeTurnMessage(game.turn === game.ownerColor, game.turn)
	let readme = [beforeTurnMessage, turnMessageDelimiter, turnMessage, afterTurnMessage].join("\n")
	const boardBeginDelimiter = "<!-- board goes here -->"
	const [beforeBoard, afterBoard] = readme.split(boardBeginDelimiter)
	readme = [beforeBoard, boardBeginDelimiter, generateReadmeBoard(game.board), afterBoard].join("\n")
	fs.writeFileSync("README.md", readme)
}

const startNewGame = () => {
	try {
		// get a clean board
		const board = createEmptyBoard()
		// get who's turn it is
		const ownerColor = 0 > 0.5 ? "r" : "y"
		const game: Game = {
			board,
			ownerColor,
			turn: "y",
			state: {
				status: "IN_PROGRESS",
			}
		}
		updateReadme(game)
		fs.writeFileSync("./data/game.json", JSON.stringify(game))
		return true
	} catch (err: any) {
		console.log(err)
		return false
	}
}

const main = async () => {
	const owner = process.env.REPOSITORY_OWNER
	if (!owner) throw new Error("No owner or repo")
	const issueNumber = process.env.ISSUE_NUMBER ?? "7"
	if (!issueNumber) throw new Error("No issue number")
	const issue = await getIssue(owner, REPO_NAME, issueNumber)
	if (issue.error) throw new Error(issue.error)
	const { title, user } = issue.body
	const isOwner = user.login === owner
	// Connect4: new | move:1
	let [_, action, arg] = title.toLowerCase().split(":")
	const game = getGame()
	switch (action.trim()) {
		case "new":
			if (game.state.status === "IN_PROGRESS" && !isOwner) return closeIssue("There is a game in progress.", issueNumber)
			startNewGame()
			return closeIssue("New game started successfully!", issueNumber)
		case "move":
			const column = arg.trim()
			if (!column) return closeIssue("Invalid move.", issueNumber)
			const state = game.state
			if (state.status !== "IN_PROGRESS") return closeIssue("There is no game in progress.", issueNumber)
			if (game.turn === game.ownerColor && !isOwner) return closeIssue("It's not your turn.", issueNumber)
			// check if move is legal
			const newBoard = addToBoard(game.board, Number(column) - 1, game.turn)
			if (newBoard === null) return closeIssue("Invalid move.", issueNumber)
			// check state
			const newGameState = getGameState(newBoard)
			if (newGameState.status === "INVALID") return closeIssue("Invalid move.", issueNumber)
			if (newGameState.status === "WINNER_RED") return handleWinner(newBoard, newGameState, "r")
			if (newGameState.status === "WINNER_YELLOW") return handleWinner(newBoard, newGameState, "y")
			if (newGameState.status === "TIE") return handleWinner(newBoard, newGameState, "d")
			const newGame: Game = {
				...game,
				board: newBoard,
				turn: game.turn === "r" ? "y" : "r",
				state: newGameState
			}
			fs.writeFileSync("./data/game.json", JSON.stringify(newGame))
			updateReadme(newGame)
			return closeIssue("Move made successfully!", issueNumber)
		default:
			closeIssue("Invalid Action", issueNumber)
	}
}

const closeIssue = (mes: string, issue: string) => {
	replyToIssue(process.env.REPOSITORY_OWNER ?? "", REPO_NAME, issue, mes)
}

const handleWinner = (board: Board, state: GameStatus, winner: "r" | "y" | "d") => {
	const game = getGame()
	const newGame: Game = {
		...game,
		board,
		state
	}
	fs.writeFileSync("./data/game.json", JSON.stringify(newGame))
	updateReadme(newGame)
	if (winner === "d") return closeIssue("It's a tie!", process.env.ISSUE_NUMBER ?? "")
	if (winner === game.ownerColor) return closeIssue("You won!", process.env.ISSUE_NUMBER ?? "")
	return closeIssue("You lost!", process.env.ISSUE_NUMBER ?? "")
}

main()
