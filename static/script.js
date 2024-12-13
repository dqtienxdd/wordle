const mode = document.querySelector("h1").textContent.toLowerCase();
const apiEndpoint = `/game/${mode}`;
let guessesRemaining = 6;
let currentGuess = [];
let nextLetter = 0;
import { WORDS } from './words.js';

let wordList = [...WORDS]; // Use the words list from words.js
let feedbackHistory = [];

console.log("Loaded Words:", WORDS);

// Initialize the board
function initBoard() {
    const board = document.getElementById("game-board");
    board.innerHTML = ""; // Clear the board to ensure no duplicates

    for (let i = 0; i < 6; i++) {
        const row = document.createElement("div");
        row.className = "letter-row";

        for (let j = 0; j < 5; j++) {
            const box = document.createElement("div");
            box.className = "letter-box";
            row.appendChild(box);
        }

        board.appendChild(row);
    }
}




// Update the color of keyboard keys
function updateKeyboardColor(guess, feedback) {
    feedback.forEach(({ guess: letter, result }) => {
        const key = document.querySelector(`.keyboard-button[data-key="${letter.toLowerCase()}"]`);
        if (!key) return;

        // Only upgrade the key color, never downgrade
        if (result === "correct" && key.style.backgroundColor !== "green") {
            key.style.backgroundColor = "green";
        } else if (result === "present" && key.style.backgroundColor !== "green") {
            key.style.backgroundColor = "yellow";
        } else if (result === "absent" && !["green", "yellow"].includes(key.style.backgroundColor)) {
            key.style.backgroundColor = "grey";
        }
    });
}

// Update this in the `checkGuess` and `autoSolve` functions after processing feedback
async function checkGuess() {
    let row = document.getElementsByClassName("letter-row")[6 - guessesRemaining];
    let guessString = currentGuess.join("");

    if (guessString.length !== 5) {
        alert("Not enough letters!");
        return;
    }

    const payload = { guess: guessString };

    if (mode === "word") {
        const targetWord = sessionStorage.getItem("target-word");
        if (!targetWord || targetWord.length !== 5) {
            alert("Target word is missing or invalid. Please restart the game and enter a valid word.");
            return;
        }
        payload.word = targetWord; // Set the target word for Guess Word mode
    } else if (mode === "random") {
        const seed = sessionStorage.getItem("random-seed");
        if (seed) {
            payload.seed = seed; // Include the seed in the payload for random mode
        } else {
            alert("Seed not found. Please start the game with a valid seed.");
            return;
        }
    }

    try {
        const response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        if (response.status !== 200) {
            alert(data.error);
            return;
        }

        const feedback = data.feedback;

        // Display feedback visually (color part remains)
        feedback.forEach((f, i) => {
            const box = row.children[i];
            box.textContent = currentGuess[i];
            box.style.backgroundColor = f.result === "correct" ? "green" : f.result === "present" ? "yellow" : "grey";
        });

        updateKeyboardColor(guessString, feedback); // Update keyboard color

        guessesRemaining--;
        feedbackHistory.push(feedback);

        if (data.solved) {
            alert("You guessed the word!");
            guessesRemaining = 0;
        } else if (guessesRemaining === 0) {
            alert("Game Over!");
        }

        currentGuess = [];
        nextLetter = 0;
    } catch (error) {
        console.error("Error during API call:", error);
    }
}


async function autoSolve() {
    let attempt = 0; // Initialize attempt counter

    // Ensure the word list is loaded from words.js
    if (!wordList || wordList.length === 0) {
        console.error("Word list is empty. Ensure words.js is loaded properly.");
        alert("Word list is not loaded. Please check your setup.");
        return;
    }

    let seed = null;
    let targetWord = null;

    if (mode === "random") {
        // Retrieve the seed for the random mode
        seed = sessionStorage.getItem("random-seed");
        if (!seed) {
            alert("Seed is missing for random mode. Please start the game with a seed.");
            return;
        }
    } else if (mode === "word") {
        // Retrieve the target word for Guess Word mode
        targetWord = sessionStorage.getItem("target-word");
        if (!targetWord || targetWord.length !== 5) {
            alert("Target word is missing or invalid for Guess Word mode. Please start the game with a valid word.");
            return;
        }
    }

    while (wordList.length > 0 && guessesRemaining > 0) {
        const guess = wordList[0]; // Use the first word in the refined list
        const payload = { guess };

        if (mode === "random" && seed) {
            // Add seed to the payload for random mode
            payload.seed = seed;
        } else if (mode === "word" && targetWord) {
            // Add target word to the payload for Guess Word mode
            payload.word = targetWord;
        }

        try {
            console.log("API Request:", `${apiEndpoint}`);
            const response = await fetch(apiEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const text = await response.text();
                console.error("API Error:", text);
                alert("API Error: " + text);
                return;
            }

            const data = await response.json();
            console.log("API Response:", data);

            const feedback = data.feedback;
            const row = document.getElementsByClassName("letter-row")[6 - guessesRemaining];

            // Display feedback visually
            feedback.forEach((f, i) => {
                const box = row.children[i];
                box.textContent = guess[i];
                box.style.backgroundColor = f.result === "correct" ? "green" : f.result === "present" ? "yellow" : "grey";
            });

            updateKeyboardColor(guess, feedback);

            guessesRemaining--;
            attempt++;

            // Check if solved
            if (feedback.every(f => f.result === "correct")) {
                alert(`Solved in ${attempt} attempts! The word is "${guess}".`);
                return;
            }

            // Refine word list based on feedback
            refineWordList(feedback);

        } catch (error) {
            console.error("Error during API call:", error);
            alert("Auto-solve failed due to a technical error. Check the console for details.");
            return;
        }
    }

    alert("Auto-solve failed. No valid words left or out of attempts.");
}


function refineWordList(feedback) {
    wordList = wordList.filter((word) => {
        return feedback.every(({ guess: letter, result, slot }) => {
            if (result === "absent") {
                // Letter must not be in the word
                return !word.includes(letter);
            } else if (result === "present") {
                // Letter must be in the word but not at this position
                return word.includes(letter) && word[slot] !== letter;
            } else if (result === "correct") {
                // Letter must be in this exact position
                return word[slot] === letter;
            }
            return true;
        });
    });
}


// Keyboard events for manual input
// Keyboard events for manual input
document.addEventListener("keyup", (e) => {
    // Ignore input if the focus is on the target word or seed input
    const activeElement = document.activeElement;
    if (activeElement.tagName === "INPUT") return;

    if (guessesRemaining === 0) return;

    const pressedKey = e.key;

    if (pressedKey === "Backspace") {
        deleteLetter();
        return;
    }

    if (pressedKey === "Enter") {
        checkGuess();
        return;
    }

    if (/^[a-z]$/i.test(pressedKey)) {
        insertLetter(pressedKey);
    }
});


// Insert a letter into the current guess
function insertLetter(pressedKey) {
    if (nextLetter === 5) return;
    const row = document.getElementsByClassName("letter-row")[6 - guessesRemaining];
    const box = row.children[nextLetter];
    box.textContent = pressedKey;
    currentGuess.push(pressedKey);
    nextLetter++;
}

// Delete a letter from the current guess
function deleteLetter() {
    if (nextLetter === 0) return;
    const row = document.getElementsByClassName("letter-row")[6 - guessesRemaining];
    const box = row.children[nextLetter - 1];
    box.textContent = "";
    currentGuess.pop();
    nextLetter--;
}

// Attach event listener to Auto-Solve button


document.getElementById("auto-solve-btn").addEventListener("click", autoSolve);
document.addEventListener("DOMContentLoaded", () => {
   
    initBoard();    // Initialize the game board
});
document.getElementById("auto-solve-btn").addEventListener("click", async () => {
    const seedInput = document.getElementById("seed");
    let seed = null;

    if (seedInput) {
        seed = seedInput.value.trim();
        if (!seed) {
            alert("Please enter a seed for random mode!");
            return;
        }
    }

    const payload = { guess: currentGuess.join(""), seed };
    try {
        const response = await fetch(`/game/random`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log("API Response:", data);

        if (data.random_word) {
            console.log(`Random Word (Seed ${seed}):`, data.random_word);
        }
    } catch (error) {
        console.error("Error:", error);
    }
});
document.addEventListener("DOMContentLoaded", () => {
    const mode = document.querySelector("h1").textContent.toLowerCase();

    // Handle Random Mode Seed Popup
    if (mode === "random") {
        const seedPopup = document.getElementById("seed-popup-random");
        const startButton = document.getElementById("start-random-game");
        const seedInput = document.getElementById("seed-input");

        seedPopup.style.display = "flex"; // Show the popup initially

        startButton.addEventListener("click", () => {
            const seed = seedInput.value.trim();

            if (!seed) {
                alert("Please enter a seed!");
                return;
            }

            // Store the seed in sessionStorage
            sessionStorage.setItem("random-seed", seed);

            // Hide the popup and start the game
            seedPopup.style.display = "none";
            console.log(`Seed entered: ${seed}`);
        });
    }

    // Handle Word Mode Target Word Popup
    if (mode === "word") {
        const seedPopup = document.getElementById("seed-popup-word");
        const startButton = document.getElementById("start-word-game");
        const targetWordInput = document.getElementById("target-word-input");

        seedPopup.style.display = "flex"; // Show the popup initially

        startButton.addEventListener("click", () => {
            const targetWord = targetWordInput.value.trim();

            if (!targetWord || targetWord.length !== 5) {
                alert("Please enter a valid 5-letter word!");
                return;
            }

            // Store the target word in sessionStorage
            sessionStorage.setItem("target-word", targetWord);

            // Hide the popup and start the game
            seedPopup.style.display = "none";
            console.log(`Target word entered: ${targetWord}`);
        });
    }

    initBoard(); // Initialize the game board
});


