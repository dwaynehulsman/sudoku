import { useState, useEffect } from "react";

const SudokuApp = () => {
  const [board, setBoard] = useState([]);
  const [solution, setSolution] = useState([]);
  const [selectedCell, setSelectedCell] = useState(null);
  const [initialBoard, setInitialBoard] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [difficulty, setDifficulty] = useState("medium");
  const [pencilMode, setPencilMode] = useState(false);
  const [pencilMarks, setPencilMarks] = useState({});
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [stats, setStats] = useState({ easy: [], medium: [], hard: [] });
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    const savedStats = localStorage.getItem("sudokuStats");
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
  }, []);

  useEffect(() => {
    if (startTime && !isComplete) {
      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [startTime, isComplete]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getAverageStats = (difficulty) => {
    const games = stats[difficulty];
    if (games.length === 0) return null;

    const avgTime =
      games.reduce((sum, game) => sum + game.time, 0) / games.length;
    const avgMistakes =
      games.reduce((sum, game) => sum + game.mistakes, 0) / games.length;

    return { avgTime, avgMistakes };
  };

  const saveStats = (time, mistakes, difficulty) => {
    const newGame = {
      time,
      mistakes,
      date: new Date().toISOString(),
    };

    const newStats = {
      ...stats,
      [difficulty]: [...stats[difficulty], newGame],
    };

    setStats(newStats);
    localStorage.setItem("sudokuStats", JSON.stringify(newStats));
  };

  const generateSolvedBoard = () => {
    const board = Array(9)
      .fill(null)
      .map(() => Array(9).fill(0));

    const isValid = (board, row, col, num) => {
      for (let x = 0; x < 9; x++) {
        if (board[row][x] === num || board[x][col] === num) return false;
      }
      const startRow = Math.floor(row / 3) * 3;
      const startCol = Math.floor(col / 3) * 3;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (board[startRow + i][startCol + j] === num) return false;
        }
      }
      return true;
    };

    const solve = (board) => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] === 0) {
            const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(
              () => Math.random() - 0.5
            );
            for (let num of numbers) {
              if (isValid(board, row, col, num)) {
                board[row][col] = num;
                if (solve(board)) return true;
                board[row][col] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };

    solve(board);
    return board;
  };

  const createPuzzle = (solvedBoard, difficulty) => {
    const puzzle = solvedBoard.map((row) => [...row]);
    const cellsToRemove =
      difficulty === "easy" ? 35 : difficulty === "medium" ? 45 : 55;

    let removed = 0;
    while (removed < cellsToRemove) {
      const row = Math.floor(Math.random() * 9);
      const col = Math.floor(Math.random() * 9);
      if (puzzle[row][col] !== 0) {
        puzzle[row][col] = 0;
        removed++;
      }
    }
    return puzzle;
  };

  const getNumberCounts = () => {
    const counts = {};
    for (let i = 1; i <= 9; i++) counts[i] = 0;

    board.forEach((row) => {
      row.forEach((cell) => {
        if (cell !== 0) counts[cell]++;
      });
    });

    return counts;
  };

  const newGame = (diff = difficulty) => {
    const solved = generateSolvedBoard();
    const puzzle = createPuzzle(solved, diff);
    setSolution(solved);
    setBoard(puzzle);
    setInitialBoard(puzzle.map((row) => [...row]));
    setSelectedCell(null);
    setMistakes(0);
    setIsComplete(false);
    setDifficulty(diff);
    setPencilMarks({});
    setPencilMode(false);
    setStartTime(Date.now());
    setElapsedTime(0);
  };

  useEffect(() => {
    newGame();
  }, []);

  const handleCellClick = (row, col) => {
    if (initialBoard[row][col] === 0) {
      setSelectedCell({ row, col });
    }
  };

  const handleNumberInput = (num) => {
    if (!selectedCell || isComplete) return;
    const { row, col } = selectedCell;
    if (initialBoard[row][col] !== 0) return;

    if (pencilMode) {
      const key = `${row}-${col}`;
      const currentMarks = pencilMarks[key] || [];
      const newMarks = currentMarks.includes(num)
        ? currentMarks.filter((n) => n !== num)
        : [...currentMarks, num].sort();

      setPencilMarks({
        ...pencilMarks,
        [key]: newMarks.length > 0 ? newMarks : undefined,
      });
    } else {
      const newBoard = board.map((r) => [...r]);
      newBoard[row][col] = num;
      setBoard(newBoard);

      const key = `${row}-${col}`;
      if (pencilMarks[key]) {
        const newPencilMarks = { ...pencilMarks };
        delete newPencilMarks[key];
        setPencilMarks(newPencilMarks);
      }

      if (num !== 0 && num !== solution[row][col]) {
        setMistakes(mistakes + 1);
      }

      checkCompletion(newBoard);
    }
  };

  const checkCompletion = (currentBoard) => {
    for (let i = 0; i < 9; i++) {
      for (let j = 0; j < 9; j++) {
        if (currentBoard[i][j] !== solution[i][j]) return;
      }
    }
    setIsComplete(true);
    saveStats(elapsedTime, mistakes, difficulty);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key >= "1" && e.key <= "9") {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") {
        handleNumberInput(0);
      } else if (e.key === "p" || e.key === "P") {
        setPencilMode(!pencilMode);
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [selectedCell, board, pencilMode, pencilMarks]);

  const numberCounts = getNumberCounts();
  const avgStats = getAverageStats(difficulty);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-3 sm:p-6 md:p-8 max-w-2xl w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-6 text-indigo-600">
          Sudoku
        </h1>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-4 sm:mb-6">
          <div className="flex gap-4 text-base sm:text-lg">
            <div>
              <span className="font-semibold">Time:</span>
              <span className="ml-2 text-gray-700">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div>
              <span className="font-semibold">Mistakes:</span>
              <span
                className={`ml-2 ${
                  mistakes > 5 ? "text-red-600" : "text-gray-700"
                }`}
              >
                {mistakes}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
          >
            {showStats ? "Hide Stats" : "View Stats"}
          </button>
        </div>

        {showStats && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h2 className="font-bold text-lg mb-2">Statistics</h2>
            {["easy", "medium", "hard"].map((diff) => {
              const diffStats = getAverageStats(diff);
              const games = stats[diff];
              if (games.length === 0) return null;

              return (
                <div key={diff} className="mb-2">
                  <div className="font-semibold capitalize">{diff}</div>
                  <div className="text-sm text-gray-600">
                    Games: {games.length} | Avg Time:{" "}
                    {formatTime(Math.round(diffStats.avgTime))} | Avg Mistakes:{" "}
                    {diffStats.avgMistakes.toFixed(1)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap justify-center items-center gap-2 mb-4">
          <button
            onClick={() => newGame("easy")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition ${
              difficulty === "easy"
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Easy
          </button>
          <button
            onClick={() => newGame("medium")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition ${
              difficulty === "medium"
                ? "bg-yellow-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Medium
          </button>
          <button
            onClick={() => newGame("hard")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition ${
              difficulty === "hard"
                ? "bg-red-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Hard
          </button>
        </div>

        <div className="flex justify-center mb-4">
          <button
            onClick={() => setPencilMode(!pencilMode)}
            className={`px-4 py-2 sm:px-6 sm:py-3 rounded-lg font-medium transition flex items-center gap-2 text-sm sm:text-base ${
              pencilMode
                ? "bg-purple-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            {pencilMode ? "Pencil Mode ON" : "Pencil Mode OFF"}
          </button>
        </div>

        <div className="w-full mb-4 sm:mb-6 flex justify-center">
          <div className="w-full max-w-md bg-gray-800 p-1 sm:p-2 rounded-lg">
            <div className="w-full aspect-square flex flex-col">
              {board.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-1">
                  {row.map((cell, colIndex) => {
                    const isSelected =
                      selectedCell?.row === rowIndex &&
                      selectedCell?.col === colIndex;
                    const isInitial = initialBoard[rowIndex][colIndex] !== 0;
                    const isWrong =
                      cell !== 0 && cell !== solution[rowIndex][colIndex];
                    const isSameNumber =
                      cell !== 0 &&
                      selectedCell &&
                      board[selectedCell.row][selectedCell.col] === cell;
                    const key = `${rowIndex}-${colIndex}`;
                    const marks = pencilMarks[key] || [];

                    return (
                      <div
                        key={colIndex}
                        onClick={() => handleCellClick(rowIndex, colIndex)}
                        className={`flex-1 flex items-center justify-center text-base sm:text-lg md:text-xl lg:text-2xl font-semibold cursor-pointer transition
                          ${
                            isSelected
                              ? "bg-indigo-300"
                              : isSameNumber
                              ? "bg-indigo-100"
                              : "bg-white hover:bg-gray-100"
                          }
                          ${
                            isInitial
                              ? "text-gray-900 font-bold"
                              : isWrong
                              ? "text-red-600"
                              : "text-indigo-600"
                          }
                          ${
                            colIndex % 3 === 2 && colIndex !== 8
                              ? "border-r-2 border-gray-800"
                              : "border-r border-gray-300"
                          }
                          ${
                            rowIndex % 3 === 2 && rowIndex !== 8
                              ? "border-b-2 border-gray-800"
                              : "border-b border-gray-300"
                          }
                          ${colIndex === 0 ? "border-l-2 border-gray-800" : ""}
                          ${rowIndex === 0 ? "border-t-2 border-gray-800" : ""}
                        `}
                      >
                        {cell !== 0 ? (
                          cell
                        ) : marks.length > 0 ? (
                          <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5 text-xs">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                              <div
                                key={num}
                                className="flex items-center justify-center text-gray-400 text-[0.5rem] sm:text-xs"
                              >
                                {marks.includes(num) ? num : ""}
                              </div>
                            ))}
                          </div>
                        ) : (
                          ""
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const isComplete = numberCounts[num] >= 9;
            return (
              <button
                key={num}
                onClick={() => handleNumberInput(num)}
                disabled={isComplete && !pencilMode}
                className={`font-bold py-2.5 sm:py-3 md:py-4 rounded-lg transition text-base sm:text-lg md:text-xl ${
                  isComplete && !pencilMode
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-500 hover:bg-indigo-600 text-white"
                }`}
              >
                {num}
              </button>
            );
          })}
          <button
            onClick={() => handleNumberInput(0)}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2.5 sm:py-3 md:py-4 rounded-lg transition text-sm sm:text-base"
          >
            Clear
          </button>
        </div>

        {isComplete && (
          <div className="bg-green-100 border-2 border-green-500 rounded-lg p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-700 mb-2">
              🎉 Congratulations!
            </p>
            <p className="text-sm sm:text-base text-gray-700 mb-2">
              Completed in {formatTime(elapsedTime)} with {mistakes} mistake
              {mistakes !== 1 ? "s" : ""}!
            </p>
            {avgStats && stats[difficulty].length > 1 && (
              <div className="text-sm text-gray-600 mb-3">
                {elapsedTime < avgStats.avgTime && (
                  <p className="text-green-600 font-semibold">
                    ⚡ {Math.round(avgStats.avgTime - elapsedTime)}s faster than
                    your average!
                  </p>
                )}
                {elapsedTime > avgStats.avgTime && (
                  <p className="text-orange-600">
                    {Math.round(elapsedTime - avgStats.avgTime)}s slower than
                    your average
                  </p>
                )}
                {mistakes < avgStats.avgMistakes && (
                  <p className="text-green-600 font-semibold">
                    ✨ {(avgStats.avgMistakes - mistakes).toFixed(1)} fewer
                    mistakes than average!
                  </p>
                )}
                {mistakes > avgStats.avgMistakes && (
                  <p className="text-orange-600">
                    {(mistakes - avgStats.avgMistakes).toFixed(1)} more mistakes
                    than average
                  </p>
                )}
              </div>
            )}
            <button
              onClick={() => newGame()}
              className="mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              New Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SudokuApp;