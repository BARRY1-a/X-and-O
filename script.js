
const $ = id => document.getElementById(id);

const cells = [...document.querySelectorAll(".cell")];

const winning = [
  [0,1,2], [3,4,5], [6,7,8],
  [0,3,6], [1,4,7], [2,5,8],
  [0,4,8], [2,4,6]
];

let board = Array(9).fill("");
let turn = "X";
let ended = false;
let mode = "human";
let scores = { X: 0, O: 0, D: 0 };
let sound = true;
let vibe = true;
let thinking = false;
let audio;

function beep(freq = 440, duration = .08, type = "sine") {
  if (!sound) return;

  try {
    audio ||= new (
      window.AudioContext || window.webkitAudioContext
    )();

    const o = audio.createOscillator();
    const g = audio.createGain();

    o.type = type;
    o.frequency.value = freq;

    g.gain.setValueAtTime(.06, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(
      .001,
      audio.currentTime + duration
    );

    o.connect(g);
    g.connect(audio.destination);

    o.start();
    o.stop(audio.currentTime + duration);
  } catch (e) {}
}

function names() {
  return {
    X: $("x-name").value.trim() || "Player X",
    O: mode === "cpu"
      ? "Computer"
      : $("o-name").value.trim() || "Player O"
  };
}

function refresh() {
  const n = names();

  $("x-player-label").textContent = n.X;
  $("o-player-label").textContent = n.O;

  $("x-score").textContent = scores.X;
  $("o-score").textContent = scores.O;
  $("draw-score").textContent = scores.D;

  $("turn-symbol").textContent = turn;
  $("turn-copy").textContent =
    (turn === "X" ? n.X : n.O) + " is up";
}

function status(text) {
  $("status").textContent = text;
}

function paint() {
  cells.forEach((cell, i) => {
    cell.textContent =
      board[i] === "X" ? "×" :
      board[i] === "O" ? "○" : "";

    cell.className =
      "cell" + (board[i] ? " " + board[i].toLowerCase() : "");

    cell.disabled =
      !!board[i] || ended || thinking;

    cell.setAttribute(
      "aria-label",
      `Row ${Math.floor(i / 3) + 1} column ${i % 3 + 1}` +
      (board[i] ? ", " + board[i] : "")
    );
  });

  refresh();
}

function result() {
  for (const line of winning) {
    const [a, b, c] = line;

    if (
      board[a] &&
      board[a] === board[b] &&
      board[a] === board[c]
    ) {
      return {
        winner: board[a],
        line
      };
    }
  }

  if (board.every(Boolean)) {
    return { winner: "D" };
  }

  return null;
}

function move(i) {
  if (board[i] || ended || thinking) return;

  board[i] = turn;

  beep(turn === "X" ? 520 : 390, .09);

  if (vibe && navigator.vibrate) {
    navigator.vibrate(18);
  }

  const r = result();

  if (r) {
    ended = true;

    if (r.winner === "D") {
      scores.D++;
      status("It's a draw!");
      $("score-caption").textContent =
        "A close match. Run it back.";
    } else {
      scores[r.winner]++;
      status(names()[r.winner] + " wins!");

      $("score-caption").textContent =
        "A point on the board!";

      r.line.forEach(i => {
        cells[i].classList.add("winner");
      });

      beep(740, .22, "triangle");

      setTimeout(() => {
        beep(990, .28, "triangle");
      }, 140);

      celebrate(r.winner);
    }

    paint();
    return;
  }

  turn = turn === "X" ? "O" : "X";
  paint();

  if (mode === "cpu" && turn === "O") {
    thinking = true;
    paint();

    setTimeout(computerMove, 430);
  }
}

function chooseMove() {
  const empty = board
    .map((v, i) => v ? null : i)
    .filter(v => v !== null);

  const level = $("difficulty").value;

  if (level === "easy") {
    return empty[
      Math.floor(Math.random() * empty.length)
    ];
  }

  function find(mark) {
    for (const i of empty) {
      board[i] = mark;

      const r = result();
      const won = r && r.winner === mark;

      board[i] = "";

      if (won) return i;
    }

    return null;
  }

  // Take a winning move if possible.
  const win = find("O");
  if (win !== null) return win;

  // Block the player's winning move.
  const block = find("X");
  if (block !== null) return block;

  if (level === "medium") {
    if (board[4] === "") return 4;

    return empty[
      Math.floor(Math.random() * empty.length)
    ];
  }

  // Hard mode: center, then corners, then any free cell.
  if (board[4] === "") return 4;

  const corners = [0, 2, 6, 8].filter(
    i => board[i] === ""
  );

  if (corners.length) {
    return corners[
      Math.floor(Math.random() * corners.length)
    ];
  }

  return empty[
    Math.floor(Math.random() * empty.length)
  ];
}

function computerMove() {
  if (ended || mode !== "cpu") return;

  thinking = false;

  const i = chooseMove();

  if (i !== undefined) {
    move(i);
  }
}

function celebrate(w) {
  $("winner-title").textContent =
    names()[w] + " wins!";

  $("winner-copy").textContent =
    w === "X"
      ? "That was a brilliant move."
      : "What a match. Ready for another?";

  const box = $("confetti");
  box.innerHTML = "";

  for (let i = 0; i < 65; i++) {
    const p = document.createElement("i");

    p.style.left = Math.random() * 100 + "%";
    p.style.animationDelay =
      Math.random() * .8 + "s";

    p.style.transform =
      `rotate(${Math.random() * 180}deg)`;

    box.appendChild(p);
  }

  $("celebration").classList.add("show");
  $("celebration").setAttribute(
    "aria-hidden",
    "false"
  );
}

function newRound() {
  board = Array(9).fill("");
  turn = "X";
  ended = false;
  thinking = false;

  $("celebration").classList.remove("show");
  $("celebration").setAttribute(
    "aria-hidden",
    "true"
  );

  status("X's turn");
  paint();
}

function setMode(m) {
  mode = m;

  $("human-mode").classList.toggle(
    "active", m === "human"
  );

  $("computer-mode").classList.toggle(
    "active", m === "cpu"
  );

  $("human-mode").setAttribute(
    "aria-pressed", String(m === "human")
  );

  $("computer-mode").setAttribute(
    "aria-pressed", String(m === "cpu")
  );

  $("o-name-wrap").style.display =
    m === "cpu" ? "none" : "grid";

  newRound();
  refresh();
}

function toggle(id, key) {
  $(id).addEventListener("click", () => {
    if (key === "sound") {
      sound = !sound;
    } else {
      vibe = !vibe;
    }

    const val = key === "sound" ? sound : vibe;

    $(id).classList.toggle("on", val);

    $(id).setAttribute(
      "aria-pressed",
      String(val)
    );

    if (key === "sound" && val) {
      beep(600);
    }
  });
}

function toast(t) {
  $("toast").textContent = t;
  $("toast").classList.add("show");

  setTimeout(() => {
    $("toast").classList.remove("show");
  }, 1500);
}

// Board controls
cells.forEach((cell, i) => {
  cell.addEventListener("click", () => move(i));
});

// Round controls
$("new-round").addEventListener("click", newRound);
$("play-again").addEventListener("click", newRound);

// Game modes
$("human-mode").addEventListener(
  "click", () => setMode("human")
);

$("computer-mode").addEventListener(
  "click", () => setMode("cpu")
);

// Score reset
$("reset-scores").addEventListener("click", () => {
  scores = { X: 0, O: 0, D: 0 };

  $("score-caption").textContent =
    "Fresh scoreboard. Let's play.";

  refresh();
  newRound();
  toast("Scores reset");
});

// Update names immediately
["x-name", "o-name"].forEach(id => {
  $(id).addEventListener("input", refresh);
});

// Sound and vibration
toggle("sound-toggle", "sound");
toggle("vibe-toggle", "vibe");

// Close winner popup with Escape
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    $("celebration").classList.remove("show");
    $("celebration").setAttribute(
      "aria-hidden",
      "true"
    );
  }
});

// Start the game
paint();
