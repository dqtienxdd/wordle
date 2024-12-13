import requests

BASE_URL = "https://wordle.votee.dev:8000"

# Function to interact with /wordseg
def wordseg(text):
    url = f"{BASE_URL}/wordseg"
    data = {"text": text}
    response = requests.post(url, data=data)
    return response.json()

# Function to interact with /daily
def guess_daily(guess, size=5):
    url = f"{BASE_URL}/daily"
    params = {"guess": guess, "size": size}
    response = requests.get(url, params=params)
    return response.json()

# Function to interact with /random
def guess_random(guess, size=5, seed=None):
    url = f"{BASE_URL}/random"
    params = {'guess': guess, 'size': size}  # Required query parameters
    if seed:
        params['seed'] = seed  # Include seed only if provided
    response = requests.get(url, params=params)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"API error: {response.text}")

# Function to interact with /word/{word}
def guess_word(word, guess):
    url = f"{BASE_URL}/word/{word}"
    params = {"guess": guess}
    response = requests.get(url, params=params)
    return response.json()