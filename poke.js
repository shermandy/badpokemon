const TOTAL_POKEMON = 1025;

// 1. Initialize Supabase Client
const SUPABASE_URL = "https://apgpchkodavylnghsvrw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_feIwKGyazC52uGp9BWY80A_8jfyutFC";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// Tab Elements
const tabGenBtn = document.getElementById("tab-generator-btn");
const tabLeadBtn = document.getElementById("tab-leaderboard-btn");
const tabLoseBtn = document.getElementById("tab-loserboard-btn");

const genView = document.getElementById("generator-view");
const leadView = document.getElementById("leaderboard-view");
const loseView = document.getElementById("loserboard-view");

const leadList = document.getElementById("leaderboard-list");
const loseList = document.getElementById("loserboard-list");

const POKEBALL_IMAGE_PATH = "images/poke-ball.png"; // Or your image path

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
  loadRankings("leaderboard", leadList);
});

tabLoseBtn.addEventListener("click", () => {
  setActiveTab(tabLoseBtn, loseView);
  loadRankings("loserboard", loseList);
});

// Fetch helper for PokéAPI
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

// 2. Updated Leaderboard & Loserboard Fetching via Supabase
async function loadRankings(type, containerElement) {
  containerElement.innerHTML = "<p>Loading Pokémon rankings...</p>";

  try {
    // Select all votes and compute score on client, or order by net score
    const { data: rankedPokemon, error } = await supabaseClient
      .from("pokemon_votes")
      .select("pokemon_id, upvotes, downvotes")
      .limit(100);

    if (error) throw error;

    if (!rankedPokemon || rankedPokemon.length === 0) {
      containerElement.innerHTML = "<p>No eligible Pokémon found yet!</p>";
      return;
    }

    // Filter & Sort by Net Score in JS
    let filtered = rankedPokemon.map((p) => ({
      ...p,
      netScore: (p.upvotes || 0) - (p.downvotes || 0),
    }));

    if (type === "leaderboard") {
      filtered = filtered
        .filter((p) => p.netScore > 0)
        .sort((a, b) => b.netScore - a.netScore);
    } else {
      filtered = filtered
        .filter((p) => p.netScore < 0)
        .sort((a, b) => a.netScore - b.netScore);
    }

    const top25 = filtered.slice(0, 25);

    if (top25.length === 0) {
      containerElement.innerHTML = "<p>No eligible Pokémon found yet!</p>";
      return;
    }

    const pokemonPromises = top25.map((p) =>
      fetchData(`https://pokeapi.co/api/v2/pokemon/${p.pokemon_id}`),
    );
    const pokemonDetails = await Promise.all(pokemonPromises);

    containerElement.innerHTML = top25
      .map((entry, index) => {
        const details = pokemonDetails[index];

        const name = details
          ? details.name.replace(/-/g, " ")
          : `Pokémon #${entry.pokemon_id}`;
        const img = details
          ? details.sprites.other["official-artwork"]?.front_default ||
            details.sprites.front_default
          : "";
        const linkName = name.split(" ")[0];
        const formattedNet =
          entry.netScore > 0 ? `+${entry.netScore}` : `${entry.netScore}`;

        return `
            <div class="leaderboard-item">
                <span class="rank-badge">#${index + 1}</span>
                <a target="_new" href="https://pokemondb.net/pokedex/${name.split(" ")[0]}">
                <img class="leaderboard-img" src="${img}" alt="${name}">
                </a>
                <div class="leaderboard-info">
                    <div class="leaderboard-name">${name}</div>
                    <div class="leaderboard-votes">
                        👍 ${entry.upvotes || 0} &nbsp;👎 ${entry.downvotes || 0}
                    </div>
                </div>
                <div class="score-badge ${entry.netScore >= 0 ? "positive" : "negative"}">
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

// 3. Fetch Votes from Supabase
async function fetchVotes(pokemonId) {
  try {
    const { data, error } = await supabaseClient
      .from("pokemon_votes")
      .select("*")
      .eq("pokemon_id", pokemonId)
      .maybeSingle();

    if (error) throw error;

    if (upvoteCount && downvoteCount) {
      upvoteCount.textContent = data ? data.upvotes || 0 : 0;
      downvoteCount.textContent = data ? data.downvotes || 0 : 0;
    }

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
    console.error("Error fetching votes from Supabase:", err);
    votingSection.style.display = "none";
  }
}

// 4. Cast Vote directly to Supabase
async function castVote(voteType) {
  if (!currentPokemonData) return;

  const pokemonId = currentPokemonData.id;
  const pokemonNameStr = currentPokemonData.name;
  const votedIds = getVotedPokemonIds();

  if (votedIds.includes(pokemonId)) return;

  // --- ADDED: Immediately apply visual feedback and lock buttons ---
  if (voteType === "upvote") {
    upvoteBtn.classList.add("selected-vote");
    downvoteBtn.classList.add("dimmed-vote");
  } else {
    downvoteBtn.classList.add("selected-vote");
    upvoteBtn.classList.add("dimmed-vote");
  }

  upvoteBtn.disabled = true;
  downvoteBtn.disabled = true;
  upvoteBtn.style.cursor = "not-allowed";
  downvoteBtn.style.cursor = "not-allowed";
  // ------------------------------------------------------------------

  try {
    // Check if record exists
    const { data: existing } = await supabaseClient
      .from("pokemon_votes")
      .select("*")
      .eq("pokemon_id", pokemonId)
      .maybeSingle();

    const isUp = voteType === "upvote";

    if (!existing) {
      // Insert new row
      const { error: insertError } = await supabaseClient
        .from("pokemon_votes")
        .insert([
          {
            pokemon_id: pokemonId,
            pokemon_name: pokemonNameStr,
            upvotes: isUp ? 1 : 0,
            downvotes: isUp ? 0 : 1,
          },
        ]);

      if (insertError) throw insertError;
    } else {
      // Update existing row
      const { error: updateError } = await supabaseClient
        .from("pokemon_votes")
        .update({
          upvotes: isUp ? (existing.upvotes || 0) + 1 : existing.upvotes,
          downvotes: !isUp ? (existing.downvotes || 0) + 1 : existing.downvotes,
        })
        .eq("pokemon_id", pokemonId);

      if (updateError) throw updateError;
    }

    votedIds.push(pokemonId);
    localStorage.setItem("user_voted_pokemon", JSON.stringify(votedIds));
    fetchVotes(pokemonId);
  } catch (err) {
    // --- ADDED: Revert classes if the DB write fails ---
    upvoteBtn.classList.remove("selected-vote", "dimmed-vote");
    downvoteBtn.classList.remove("selected-vote", "dimmed-vote");
    upvoteBtn.disabled = false;
    downvoteBtn.disabled = false;
    upvoteBtn.style.cursor = "pointer";
    downvoteBtn.style.cursor = "pointer";
    // ----------------------------------------------------

    console.error("Error submitting vote to Supabase:", err);
    alert("Could not save vote. Please try again!");
  }
}

// Slot Machine & Display Logic
async function spinSlotMachine() {
  drawBtn.disabled = true;

  upvoteBtn.classList.remove("selected-vote", "dimmed-vote");
  downvoteBtn.classList.remove("selected-vote", "dimmed-vote");
  upvoteBtn.disabled = false;
  downvoteBtn.disabled = false;
  upvoteBtn.style.cursor = "pointer";
  downvoteBtn.style.cursor = "pointer";

  const targetId = Math.floor(Math.random() * TOTAL_POKEMON) + 1;

  // 1. Start API requests immediately in background
  const speciesPromise = fetchData(
    `https://pokeapi.co/api/v2/pokemon-species/${targetId}`,
  );
  const basePokemonPromise = fetchData(
    `https://pokeapi.co/api/v2/pokemon/${targetId}`,
  );

  // 2. Prepare UI for the Pokéball animation
  imgContainer.style.display = "flex";
  pokemonImg.style.display = "block";
  pokemonName.textContent = "Catching...";

  // Reset previous animation classes
  pokemonImg.classList.remove("pokemon-burst");
  pokemonTypes.innerHTML = "";
  statsContainer.innerHTML = "";
  pokedexEntry.style.display = "none";
  pokedexLink.style.display = "none";
  shinyBtn.style.display = "none";
  varietySelect.style.display = "none";
  votingSection.style.display = "none";

  // Set sprite to Pokéball and start bouncing/wobbling
  pokemonImg.src = POKEBALL_IMAGE_PATH;
  pokemonImg.classList.add("pokeball-anim");

  // 3. Wait for API response + enforce a minimum 1.8s animation window
  const [_, speciesData, basePokemonData] = await Promise.all([
    new Promise((resolve) => setTimeout(resolve, 1800)),
    speciesPromise,
    basePokemonPromise,
  ]);

  // Remove Pokéball animation
  pokemonImg.classList.remove("pokeball-anim");

  if (basePokemonData) {
    currentPokemonData = basePokemonData;
    currentSpeciesData = speciesData;

    // Trigger burst/reveal animation on the actual Pokémon sprite
    pokemonImg.classList.add("pokemon-burst");

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

      const percentage = Math.min((value / 200) * 100, 100);
      const saturation = Math.round(25 + percentage * 0.7);

      const isLightMode =
        document.body.classList.contains("light-mode") ||
        window.matchMedia("(prefers-color-scheme: light)").matches;

      const lightness = isLightMode
        ? Math.round(85 - percentage * 0.55)
        : Math.round(35 + percentage * 0.5);

      return `
            <div class="stat-row">
                <div class="stat-value-wrapper">
                    <span class="stat-name">${name}</span>
                    <span class="stat-value">${value}</span>
                </div>
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
