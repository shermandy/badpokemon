const TOTAL_POKEMON = 1025;
const BACKEND_URL = "http://localhost:3000/api";

// Tab Elements
const tabGenBtn = document.getElementById("tab-generator-btn");
const tabLeadBtn = document.getElementById("tab-leaderboard-btn");
const tabLoseBtn = document.getElementById("tab-loserboard-btn");

const genView = document.getElementById("generator-view");
const leadView = document.getElementById("leaderboard-view");
const loseView = document.getElementById("loserboard-view");

const leadList = document.getElementById("leaderboard-list");
const loseList = document.getElementById("loserboard-list");

// Randomizer Elements
const drawBtn = document.getElementById("draw-btn");
const shinyBtn = document.getElementById("shiny-btn");
const varietySelect = document.getElementById("variety-select");
const imgContainer = document.getElementById("img-container");
const pokemonImg = document.getElementById("pokemon-img");
const pokemonName = document.getElementById("pokemon-name");
const pokemonTypes = document.getElementById("pokemon-types");
const pokedexEntry = document.getElementById("pokedex-entry");
const pokedexLink = document.getElementById("pokedex-link");
const statsContainer = document.getElementById("stats-container");

// Voting Elements
const votingSection = document.getElementById("voting-section");
const upvoteBtn = document.getElementById("upvote-btn");
const downvoteBtn = document.getElementById("downvote-btn");
const upvoteCount = document.getElementById("upvote-count");
const downvoteCount = document.getElementById("downvote-count");

let currentPokemonData = null;
let currentSpeciesData = null;
let isShiny = false;

// Tab Switching Event Listeners
function setActiveTab(activeBtn, activeView) {
  [tabGenBtn, tabLeadBtn, tabLoseBtn].forEach((btn) =>
    btn.classList.remove("active"),
  );
  [genView, leadView, loseView].forEach((view) => view.classList.add("hidden"));

  activeBtn.classList.add("active");
  activeView.classList.remove("hidden");
}

tabGenBtn.addEventListener("click", () => {
  setActiveTab(tabGenBtn, genView);
});

tabLeadBtn.addEventListener("click", () => {
  setActiveTab(tabLeadBtn, leadView);
  loadRankings(`${BACKEND_URL}/leaderboard`, leadList);
});

tabLoseBtn.addEventListener("click", () => {
  setActiveTab(tabLoseBtn, loseView);
  loadRankings(`${BACKEND_URL}/loserboard`, loseList);
});

// Fetch helper
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Network response was not ok");
    return await response.json();
  } catch (error) {
    console.error("Fetch error:", error);
    return null;
  }
}

// Shared Leaderboard & Loserboard Fetching Logic
async function loadRankings(endpointUrl, containerElement) {
  containerElement.innerHTML = "<p>Loading Pokémon rankings...</p>";

  try {
    const res = await fetch(endpointUrl);
    const rankedPokemon = await res.json();

    if (!rankedPokemon || rankedPokemon.length === 0) {
      containerElement.innerHTML = "<p>No eligible Pokémon found yet!</p>";
      return;
    }

    const pokemonPromises = rankedPokemon.map((p) =>
      fetchData(`https://pokeapi.co/api/v2/pokemon/${p.pokemon_id}`),
    );
    const pokemonDetails = await Promise.all(pokemonPromises);

    containerElement.innerHTML = rankedPokemon
      .map((entry, index) => {
        const details = pokemonDetails[index];
        const name = details
          ? details.name.replace(/-/g, " ")
          : `Pokémon #${entry.pokemon_id}`;
        const img = details
          ? details.sprites.other["official-artwork"]?.front_default ||
            details.sprites.front_default
          : "";

        const netScore = entry.upvotes - entry.downvotes;
        const formattedNet = netScore > 0 ? `+${netScore}` : `${netScore}`;

        return `
                <div class="leaderboard-item">
                    <span class="rank-badge">#${index + 1}</span>
                    <img class="leaderboard-img" src="${img}" alt="${name}">
                    <div class="leaderboard-info">
                        <div class="leaderboard-name">${name}</div>
                        <div class="leaderboard-votes">
                            👍 ${entry.upvotes} &nbsp;👎 ${entry.downvotes}
                        </div>
                    </div>
                    <div class="score-badge ${netScore >= 0 ? "positive" : "negative"}">
                        ${formattedNet}
                    </div>
                </div>
            `;
      })
      .join("");
  } catch (err) {
    console.error("Error loading rankings:", err);
    containerElement.innerHTML = "<p>Failed to load rankings.</p>";
  }
}

// LocalStorage Vote Helpers
function getVotedPokemonIds() {
  const saved = localStorage.getItem("user_voted_pokemon");
  return saved ? JSON.parse(saved) : [];
}

async function fetchVotes(pokemonId) {
  try {
    const res = await fetch(`${BACKEND_URL}/votes/${pokemonId}`);
    if (!res.ok) throw new Error("Failed to fetch votes");
    const data = await res.json();

    // upvoteCount.textContent = data.upvotes || 0;
    // downvoteCount.textContent = data.downvotes || 0;
    votingSection.style.display = "flex";

    const votedIds = getVotedPokemonIds();
    const hasVoted = votedIds.includes(pokemonId);

    upvoteBtn.disabled = hasVoted;
    downvoteBtn.disabled = hasVoted;

    upvoteBtn.style.opacity = hasVoted ? "0.5" : "1";
    downvoteBtn.style.opacity = hasVoted ? "0.5" : "1";
    upvoteBtn.style.cursor = hasVoted ? "not-allowed" : "pointer";
    downvoteBtn.style.cursor = hasVoted ? "not-allowed" : "pointer";
  } catch (err) {
    console.error("Error fetching votes from server:", err);
    votingSection.style.display = "none";
  }
}

async function castVote(voteType) {
  if (!currentPokemonData) return;

  const pokemonId = currentPokemonData.id;
  const votedIds = getVotedPokemonIds();
  if (votedIds.includes(pokemonId)) return;

  try {
    const res = await fetch(`${BACKEND_URL}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pokemonId, voteType }),
    });

    if (res.ok) {
      votedIds.push(pokemonId);
      localStorage.setItem("user_voted_pokemon", JSON.stringify(votedIds));
      fetchVotes(pokemonId);
    }
  } catch (err) {
    console.error("Error sending vote to server:", err);
    alert("Could not save vote. Make sure your local server is running!");
  }
}

// Slot Machine & Display Logic
async function spinSlotMachine() {
  drawBtn.disabled = true;

  const targetId = Math.floor(Math.random() * TOTAL_POKEMON) + 1;

  const speciesPromise = fetchData(
    `https://pokeapi.co/api/v2/pokemon-species/${targetId}`,
  );
  const basePokemonPromise = fetchData(
    `https://pokeapi.co/api/v2/pokemon/${targetId}`,
  );

  imgContainer.style.display = "flex";
  pokemonImg.style.display = "block";
  pokemonName.textContent = "Rolling...";
  pokemonTypes.innerHTML = "";
  statsContainer.innerHTML = "";
  pokedexEntry.style.display = "none";
  pokedexLink.style.display = "none";
  shinyBtn.style.display = "none";
  varietySelect.style.display = "none";
  votingSection.style.display = "none";

  pokemonImg.classList.add("slot-spinning");

  const spinDuration = 2000;
  const intervalTime = 80;

  const intervalId = setInterval(() => {
    const randomTempId = Math.floor(Math.random() * TOTAL_POKEMON) + 1;
    pokemonImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${randomTempId}.png`;
  }, intervalTime);

  const [_, speciesData, basePokemonData] = await Promise.all([
    new Promise((resolve) => setTimeout(resolve, spinDuration)),
    speciesPromise,
    basePokemonPromise,
  ]);

  clearInterval(intervalId);
  pokemonImg.classList.remove("slot-spinning");

  if (basePokemonData) {
    currentPokemonData = basePokemonData;
    currentSpeciesData = speciesData;
    setupVarietiesDropdown(speciesData);
    updatePokemonDisplay();
  } else {
    pokemonName.textContent = "Failed to load!";
  }

  drawBtn.disabled = false;
}

function setupVarietiesDropdown(speciesData) {
  if (
    speciesData &&
    speciesData.varieties &&
    speciesData.varieties.length > 1
  ) {
    varietySelect.innerHTML = speciesData.varieties
      .map((v) => {
        const cleanName = v.pokemon.name.replace(/-/g, " ");
        return `<option value="${v.pokemon.url}">${cleanName}</option>`;
      })
      .join("");
    varietySelect.style.display = "inline-block";
  } else {
    varietySelect.style.display = "none";
  }
}

function updatePokemonDisplay() {
  if (!currentPokemonData) return;

  shinyBtn.style.display = "inline-block";

  const sprites = currentPokemonData.sprites;

  let artSrc = isShiny
    ? sprites.other["official-artwork"]?.front_shiny || sprites.front_shiny
    : sprites.other["official-artwork"]?.front_default || sprites.front_default;

  pokemonImg.src = artSrc;

  const baseName = currentSpeciesData
    ? currentSpeciesData.name
    : currentPokemonData.name;
  pokemonName.textContent = currentPokemonData.name.replace(/-/g, " ");

  pokemonTypes.innerHTML = currentPokemonData.types
    .map((t) => `<span class="type-badge">${t.type.name}</span>`)
    .join("");

  if (currentSpeciesData && currentSpeciesData.flavor_text_entries) {
    const englishEntry = currentSpeciesData.flavor_text_entries.find(
      (entry) => entry.language.name === "en",
    );
    if (englishEntry) {
      const cleanText = englishEntry.flavor_text.replace(/[\n\f]/g, " ");
      pokedexEntry.textContent = `"${cleanText}"`;
      pokedexEntry.style.display = "block";
    }
  }

  pokedexLink.href = `https://pokemondb.net/pokedex/${baseName}`;
  pokedexLink.style.display = "inline-block";

  const statAbbreviations = {
    hp: "HP",
    attack: "Attack",
    defense: "Defense",
    "special-attack": "Sp. Atk",
    "special-defense": "Sp. Def",
    speed: "Speed",
  };

  // Render Stats Bars
  statsContainer.innerHTML = currentPokemonData.stats
    .map((s) => {
      const name = statAbbreviations[s.stat.name] || s.stat.name;
      const value = s.base_stat;

      // Normalize percentage (0 to 100 based on max base stat around 200)
      const percentage = Math.min((value / 200) * 100, 100);

      // Saturation stays the same: Low stats (25% muted) -> High stats (95% rich color)
      const saturation = Math.round(25 + percentage * 0.7);

      // Check if user is in Light Mode (via body class or OS preference)
      const isLightMode =
        document.body.classList.contains("light-mode") ||
        window.matchMedia("(prefers-color-scheme: light)").matches;

      // Flip Lightness mapping for Light Mode vs Dark Mode:
      // Dark Mode:  Low stat = 35% (Darker)  -> High stat = 85% (Lighter)
      // Light Mode: Low stat = 85% (Lighter) -> High stat = 30% (Darker)
      const lightness = isLightMode
        ? Math.round(85 - percentage * 0.55)
        : Math.round(35 + percentage * 0.5);

      return `
            <div class="stat-row">
                <span class="stat-name">${name}</span>
                <span class="stat-value">${value}</span>
                <div class="stat-bar-background">
                    <div class="stat-bar-fill" style="width: ${percentage}%; background-color: hsl(from var(--stat-fill) h ${saturation}% ${lightness}%);"></div>
                </div>
            </div>
        `;
    })
    .join("");

  fetchVotes(currentPokemonData.id);
}

// Event Listeners
drawBtn.addEventListener("click", spinSlotMachine);
upvoteBtn.addEventListener("click", () => castVote("upvote"));
downvoteBtn.addEventListener("click", () => castVote("downvote"));

shinyBtn.addEventListener("click", () => {
  isShiny = !isShiny;
  shinyBtn.classList.toggle("active", isShiny);
  updatePokemonDisplay();
});

varietySelect.addEventListener("change", async (e) => {
  const selectedUrl = e.target.value;
  const newData = await fetchData(selectedUrl);
  if (newData) {
    currentPokemonData = newData;
    updatePokemonDisplay();
  }
});
