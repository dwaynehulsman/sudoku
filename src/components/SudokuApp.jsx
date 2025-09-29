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
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const savedStats = localStorage.getItem("sudokuStats");
    if (savedStats) {
      setStats(JSON.parse(savedStats));
    }
    const savedDarkMode = localStorage.getItem("darkMode");
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-slate-800 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-3 sm:p-6 md:p-8 max-w-2xl w-full relative">
        {/* Top left - Stats button */}
        <div className="absolute top-3 left-3 sm:top-6 sm:left-6">
          <button
            onClick={() => setShowStats(!showStats)}
            className="p-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
            title="Statistics"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </button>
        </div>

        {/* Top right - Settings button */}
        <div className="absolute top-3 right-3 sm:top-6 sm:right-6">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Settings dropdown */}
        {showSettings && (
          <div className="absolute top-14 right-3 sm:top-16 sm:right-6 bg-white dark:bg-gray-700 rounded-lg shadow-lg p-4 z-10 min-w-[200px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold dark:text-gray-200">Dark Mode</span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  darkMode ? "bg-indigo-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    darkMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
            <hr className="border-gray-200 dark:border-gray-600 mb-3" />
            <a
              href="https://buymeacoffee.com/dwaynehulsman"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.216 6.415l-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 00-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 00-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 01-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 013.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 01-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 01-4.743.295 37.059 37.059 0 01-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0011.343.376.483.483 0 01.535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 01.39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 01-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 01-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 00-1.322-.238c-.826 0-1.491.284-2.26.613z"/>
              </svg>
              Buy Me a Coffee
            </a>
          </div>
        )}

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-3 sm:mb-6 text-indigo-600 dark:text-indigo-400">
          Sudoku
        </h1>

        <div className="flex justify-center items-center gap-3 mb-4 sm:mb-6">
          <div className="flex gap-4 text-base sm:text-lg">
            <div>
              <span className="font-semibold dark:text-gray-300">Time:</span>
              <span className="ml-2 text-gray-700 dark:text-gray-400">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div>
              <span className="font-semibold dark:text-gray-300">Mistakes:</span>
              <span
                className={`ml-2 ${
                  mistakes > 5 ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-gray-400"
                }`}
              >
                {mistakes}
              </span>
            </div>
          </div>
        </div>

        {showStats && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h2 className="font-bold text-lg mb-2 dark:text-gray-200">Statistics</h2>
            {["easy", "medium", "hard"].map((diff) => {
              const diffStats = getAverageStats(diff);
              const games = stats[diff];
              if (games.length === 0) return null;

              return (
                <div key={diff} className="mb-2">
                  <div className="font-semibold capitalize dark:text-gray-300">{diff}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
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
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Easy
          </button>
          <button
            onClick={() => newGame("medium")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition ${
              difficulty === "medium"
                ? "bg-yellow-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            Medium
          </button>
          <button
            onClick={() => newGame("hard")}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg font-medium transition ${
              difficulty === "hard"
                ? "bg-red-500 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
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
                : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
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
          <div className="w-full max-w-md bg-gray-800 dark:bg-gray-900 p-1 sm:p-2 rounded-lg">
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
                              ? "bg-indigo-300 dark:bg-indigo-700"
                              : isSameNumber
                              ? "bg-indigo-100 dark:bg-indigo-900"
                              : "bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                          }
                          ${
                            isInitial
                              ? "text-gray-900 dark:text-gray-100 font-bold"
                              : isWrong
                              ? "text-red-600 dark:text-red-400"
                              : "text-indigo-600 dark:text-indigo-400"
                          }
                          ${
                            colIndex % 3 === 2 && colIndex !== 8
                              ? "border-r-2 border-gray-800 dark:border-gray-600"
                              : "border-r border-gray-300 dark:border-gray-600"
                          }
                          ${
                            rowIndex % 3 === 2 && rowIndex !== 8
                              ? "border-b-2 border-gray-800 dark:border-gray-600"
                              : "border-b border-gray-300 dark:border-gray-600"
                          }
                          ${colIndex === 0 ? "border-l-2 border-gray-800 dark:border-gray-600" : ""}
                          ${rowIndex === 0 ? "border-t-2 border-gray-800 dark:border-gray-600" : ""}
                        `}
                      >
                        {cell !== 0 ? (
                          cell
                        ) : marks.length > 0 ? (
                          <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5 text-xs">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                              <div
                                key={num}
                                className="flex items-center justify-center text-gray-400 dark:text-gray-500 text-[0.5rem] sm:text-xs"
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
                    ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
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
          <div className="bg-green-100 dark:bg-green-900 border-2 border-green-500 dark:border-green-600 rounded-lg p-4 text-center">
            <p className="text-xl sm:text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
              🎉 Congratulations!
            </p>
            <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2">
              Completed in {formatTime(elapsedTime)} with {mistakes} mistake
              {mistakes !== 1 ? "s" : ""}!
            </p>
            {avgStats && stats[difficulty].length > 1 && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {elapsedTime < avgStats.avgTime && (
                  <p className="text-green-600 dark:text-green-400 font-semibold">
                    ⚡ {Math.round(avgStats.avgTime - elapsedTime)}s faster than
                    your average!
                  </p>
                )}
                {elapsedTime > avgStats.avgTime && (
                  <p className="text-orange-600 dark:text-orange-400">
                    {Math.round(elapsedTime - avgStats.avgTime)}s slower than
                    your average
                  </p>
                )}
                {mistakes < avgStats.avgMistakes && (
                  <p className="text-green-600 dark:text-green-400 font-semibold">
                    ✨ {(avgStats.avgMistakes - mistakes).toFixed(1)} fewer
                    mistakes than average!
                  </p>
                )}
                {mistakes > avgStats.avgMistakes && (
                  <p className="text-orange-600 dark:text-orange-400">
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