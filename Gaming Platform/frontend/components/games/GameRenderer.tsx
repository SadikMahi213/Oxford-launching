"use client";

import React from "react";
import dynamic from "next/dynamic";
import type { Game } from "@/lib/games/types";

interface GameRendererProps {
  game: Game;
}

const games: Record<string, React.ComponentType<{ config?: Record<string, unknown> }>> = {
  "number-guess": dynamic(() => import("./engines/NumberGuess"), { ssr: false }),
  "higher-or-lower": dynamic(() => import("./engines/HigherOrLower"), { ssr: false }),
  "memory-match": dynamic(() => import("./engines/MemoryMatch"), { ssr: false }),
  "reaction-test": dynamic(() => import("./engines/ReactionTest"), { ssr: false }),
  "color-match": dynamic(() => import("./engines/ColorMatch"), { ssr: false }),
  "speed-click": dynamic(() => import("./engines/SpeedClick"), { ssr: false }),
  "dice-roller": dynamic(() => import("./engines/DiceRoller"), { ssr: false }),
  "coin-flip": dynamic(() => import("./engines/CoinFlip"), { ssr: false }),
  "rock-paper-scissors": dynamic(() => import("./engines/RockPaperScissors"), { ssr: false }),
  "tic-tac-toe": dynamic(() => import("./engines/TicTacToe"), { ssr: false }),
  "connect-four": dynamic(() => import("./engines/ConnectFour"), { ssr: false }),
  "snake": dynamic(() => import("./engines/Snake"), { ssr: false }),
  "breakout": dynamic(() => import("./engines/Breakout"), { ssr: false }),
  "tetris": dynamic(() => import("./engines/Tetris"), { ssr: false }),
  "pong": dynamic(() => import("./engines/Pong"), { ssr: false }),
  "space-invaders": dynamic(() => import("./engines/SpaceInvaders"), { ssr: false }),
  "flappy-bird": dynamic(() => import("./engines/FlappyBird"), { ssr: false }),
  "2048": dynamic(() => import("./engines/Game2048"), { ssr: false }),
  "minesweeper": dynamic(() => import("./engines/Minesweeper"), { ssr: false }),
  "sudoku": dynamic(() => import("./engines/Sudoku"), { ssr: false }),
  "word-guess": dynamic(() => import("./engines/WordGuess"), { ssr: false }),
  "typing-speed": dynamic(() => import("./engines/TypingSpeed"), { ssr: false }),
  "math-challenge": dynamic(() => import("./engines/MathChallenge"), { ssr: false }),
  "simon-says": dynamic(() => import("./engines/SimonSays"), { ssr: false }),
  "poker-hand-trainer": dynamic(() => import("./engines/PokerHandTrainer"), { ssr: false }),
  "asteroids": dynamic(() => import("./engines/Asteroids"), { ssr: false }),
  "pacman": dynamic(() => import("./engines/Pacman"), { ssr: false }),
  "galaga": dynamic(() => import("./engines/Galaga"), { ssr: false }),
  "centipede": dynamic(() => import("./engines/Centipede"), { ssr: false }),
  "frogger": dynamic(() => import("./engines/Frogger"), { ssr: false }),
  "donkey-kong": dynamic(() => import("./engines/DonkeyKong"), { ssr: false }),
  "defender": dynamic(() => import("./engines/Defender"), { ssr: false }),
  "missile-command": dynamic(() => import("./engines/MissileCommand"), { ssr: false }),
  "joust": dynamic(() => import("./engines/Joust"), { ssr: false }),
  "card-flip": dynamic(() => import("./engines/CardFlip"), { ssr: false }),
  "solitaire": dynamic(() => import("./engines/Solitaire"), { ssr: false }),
  "blackjack-demo": dynamic(() => import("./engines/BlackjackDemo"), { ssr: false }),
  "card-war": dynamic(() => import("./engines/CardWar"), { ssr: false }),
  "go-fish": dynamic(() => import("./engines/GoFish"), { ssr: false }),
  "hearts": dynamic(() => import("./engines/Hearts"), { ssr: false }),
  "spades": dynamic(() => import("./engines/Spades"), { ssr: false }),
  "crazy-eights": dynamic(() => import("./engines/CrazyEights"), { ssr: false }),
  "dice-duel": dynamic(() => import("./engines/DiceDuel"), { ssr: false }),
  "yahtzee": dynamic(() => import("./engines/Yahtzee"), { ssr: false }),
  "liars-dice": dynamic(() => import("./engines/LiarsDice"), { ssr: false }),
  "farkle": dynamic(() => import("./engines/Farkle"), { ssr: false }),
  "pig": dynamic(() => import("./engines/Pig"), { ssr: false }),
  "sevens": dynamic(() => import("./engines/Sevens"), { ssr: false }),
  "ship-captain-crew": dynamic(() => import("./engines/ShipCaptainCrew"), { ssr: false }),
  "lucky-wheel": dynamic(() => import("./engines/LuckyWheel"), { ssr: false }),
  "wheel-of-words": dynamic(() => import("./engines/WheelOfWords"), { ssr: false }),
  "prize-wheel": dynamic(() => import("./engines/PrizeWheel"), { ssr: false }),
  "number-wheel": dynamic(() => import("./engines/NumberWheel"), { ssr: false }),
  "color-wheel": dynamic(() => import("./engines/ColorWheel"), { ssr: false }),
  "crossword": dynamic(() => import("./engines/Crossword"), { ssr: false }),
  "word-search": dynamic(() => import("./engines/WordSearch"), { ssr: false }),
  "cryptogram": dynamic(() => import("./engines/Cryptogram"), { ssr: false }),
  "hangman": dynamic(() => import("./engines/Hangman"), { ssr: false }),
  "nonogram": dynamic(() => import("./engines/Nonogram"), { ssr: false }),
  "sliding-puzzle": dynamic(() => import("./engines/SlidingPuzzle"), { ssr: false }),
  "tower-of-hanoi": dynamic(() => import("./engines/TowerOfHanoi"), { ssr: false }),
  "logic-grid": dynamic(() => import("./engines/LogicGrid"), { ssr: false }),
  "tetromino-stack": dynamic(() => import("./engines/TetrominoStack"), { ssr: false }),
  "sokoban": dynamic(() => import("./engines/Sokoban"), { ssr: false }),
  "pipe-puzzle": dynamic(() => import("./engines/PipePuzzle"), { ssr: false }),
  "light-up": dynamic(() => import("./engines/LightUp"), { ssr: false }),
  "othello": dynamic(() => import("./engines/Othello"), { ssr: false }),
  "checkers": dynamic(() => import("./engines/Checkers"), { ssr: false }),
  "chess-puzzle": dynamic(() => import("./engines/ChessPuzzle"), { ssr: false }),
  "battleship": dynamic(() => import("./engines/Battleship"), { ssr: false }),
  "nim": dynamic(() => import("./engines/Nim"), { ssr: false }),
  "mastermind": dynamic(() => import("./engines/Mastermind"), { ssr: false }),
  "gomoku": dynamic(() => import("./engines/Gomoku"), { ssr: false }),
  "dots-and-boxes": dynamic(() => import("./engines/DotsAndBoxes"), { ssr: false }),
  "memory-tiles": dynamic(() => import("./engines/MemoryTiles"), { ssr: false }),
  "number-memory": dynamic(() => import("./engines/NumberMemory"), { ssr: false }),
  "color-memory": dynamic(() => import("./engines/ColorMemory"), { ssr: false }),
  "card-memory": dynamic(() => import("./engines/CardMemory"), { ssr: false }),
  "pattern-memory": dynamic(() => import("./engines/PatternMemory"), { ssr: false }),
  "word-memory": dynamic(() => import("./engines/WordMemory"), { ssr: false }),
  "visual-memory": dynamic(() => import("./engines/VisualMemory"), { ssr: false }),
  "sequence-challenge": dynamic(() => import("./engines/SequenceChallenge"), { ssr: false }),
  "target-click": dynamic(() => import("./engines/TargetClick"), { ssr: false }),
  "reflex-arrow": dynamic(() => import("./engines/ReflexArrow"), { ssr: false }),
  "avoid-the-wall": dynamic(() => import("./engines/AvoidTheWall"), { ssr: false }),
  "number-sequence": dynamic(() => import("./engines/NumberSequence"), { ssr: false }),
  "prime-finder": dynamic(() => import("./engines/PrimeFinder"), { ssr: false }),
  "fibonacci": dynamic(() => import("./engines/Fibonacci"), { ssr: false }),
  "factor-battle": dynamic(() => import("./engines/FactorBattle"), { ssr: false }),
  "digit-sum": dynamic(() => import("./engines/DigitSum"), { ssr: false }),
  "power-of-two": dynamic(() => import("./engines/PowerOfTwo"), { ssr: false }),
  "fast-calculation": dynamic(() => import("./engines/FastCalculation"), { ssr: false }),
  "typing-tutor": dynamic(() => import("./engines/TypingTutor"), { ssr: false }),
  "trivia-quiz": dynamic(() => import("./engines/TriviaQuiz"), { ssr: false }),
  "word-scramble": dynamic(() => import("./engines/WordScramble"), { ssr: false }),
  "anagram-solver": dynamic(() => import("./engines/AnagramSolver"), { ssr: false }),
  "story-builder": dynamic(() => import("./engines/StoryBuilder"), { ssr: false }),
  "emoji-puzzle": dynamic(() => import("./engines/EmojiPuzzle"), { ssr: false }),
  "math-blitz": dynamic(() => import("./engines/MathBlitz"), { ssr: false }),
  "jigsaw-puzzle": dynamic(() => import("./engines/JigsawPuzzle"), { ssr: false }),
};

export default function GameRenderer({ game }: GameRendererProps) {
  const GameComponent = games[game.game_slug];

  if (!GameComponent) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Game not available</h2>
          <p className="text-muted-foreground">
            The game &quot;{game.game_slug}&quot; could not be found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <GameComponent config={game.config} />
    </div>
  );
}
