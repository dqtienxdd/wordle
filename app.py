from flask import Flask, render_template, request, jsonify
from api import guess_daily, guess_random, guess_word

app = Flask(__name__, static_folder="static")

@app.route("/")
def home():
    """Homepage to choose game mode."""
    return render_template("index.html")


@app.route("/game/<mode>", methods=["GET", "POST"])
def game(mode):
    if request.method == "POST":
        guess = request.json.get("guess")
        word = request.json.get("word", None)
        seed = request.json.get("seed", None)

        if not guess or len(guess) != 5:
            return jsonify({"error": "Invalid guess. Please enter a 5-letter word."}), 400

        if mode == "daily":
            feedback = guess_daily(guess)
        elif mode == "random":
            if not seed:
                return jsonify({"error": "Seed is required for random mode."}), 400
            feedback = guess_random(guess, seed=seed)
            print(f"Random mode seed: {seed}")  # Log the seed for debugging
        elif mode == "word":
            if not word or len(word) != 5:
                return jsonify({"error": "Invalid word. Provide a 5-letter word."}), 400
            feedback = guess_word(word, guess)
        else:
            return jsonify({"error": "Invalid mode selected."}), 400

        solved = all(f["result"] == "correct" for f in feedback)
        return jsonify({"feedback": feedback, "solved": solved})

    return render_template("game.html", mode=mode)



if __name__ == "__main__":
    app.run(debug=True)
