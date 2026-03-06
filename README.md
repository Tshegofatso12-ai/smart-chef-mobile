# Smart Chef

A React Native mobile app that turns your ingredients into recipes using AI. Scan, type, or speak your ingredients and get three creative, diet-aware recipes instantly.

## Features

- **Magic Scan** — take a photo of your fridge or pantry and Claude identifies every ingredient automatically
- **Type or Voice input** — add ingredients by typing or speaking naturally
- **AI Recipe Generation** — Claude generates 3 distinct recipes tailored to your ingredients and diet preference
- **Diet Filters** — Low-Fat, Low-Carb, or High-Protein
- **Fix an Ingredient** — correct a misdetected item by typing or speaking (e.g. "Lemon not pomelo")
- **Save Recipes** — bookmark recipes and revisit them from the Saved tab
- **Session History** — all past recipe sessions are stored locally

## Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 52 + expo-router 4 |
| Language | TypeScript (strict) |
| Styling | Nativewind v4 + Tailwind CSS v3 |
| AI | Claude claude-sonnet-4-6 via `@anthropic-ai/sdk` |
| Camera | expo-image-picker |
| Voice | expo-speech-recognition |
| Storage | AsyncStorage |
| Gradients | expo-linear-gradient |
| Fonts | Nunito Sans + Playfair Display |

## Project Structure

```
app/
  _layout.tsx          # Root Stack layout, font loading
  index.tsx            # Home screen — scan, type, or speak ingredients
  ingredient-tray.tsx  # Detected Items — review, edit, fix, generate recipes
  recipe-ideas.tsx     # Recipe results list
  recipe/[id].tsx      # Full recipe card with steps
  saved.tsx            # Saved recipes

components/
  Icon.tsx             # Maps Solar/Hugeicons icon names to @expo/vector-icons
  RecipeRow.tsx        # Shared recipe list item (used by Home and Saved)
  Shimmer.tsx          # Animated shimmer skeleton
  LoadingOverlay.tsx   # Full-screen loading state

context/
  AppContext.tsx        # Global state: sessions, saved recipes, tray ingredients

lib/
  claude.ts            # Claude API calls: extract ingredients, generate recipes, apply fixes
  storage.ts           # AsyncStorage helpers

types/
  index.ts             # Shared TypeScript types
```

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
git clone https://github.com/Tshegofatso12-ai/smart-chef-mobile.git
cd smart-chef-mobile
npm install
```

Create a `.env` file in the project root:

```
EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

### Run

```bash
# Expo Go (limited — voice and camera require native build)
npx expo start

# iOS native build (required for voice input)
npx expo run:ios

# Run on a physical iOS device
npx expo run:ios --device
```

## Key Flows

### Ingredient Detection
1. Home screen → tap Magic Scan
2. Camera opens → capture or pick a photo
3. Image is sent to Claude as base64 via `extractIngredientsFromImage`
4. Parsed ingredients are stored in `AppContext.trayIngredients`
5. App navigates to Detected Items screen

### Recipe Generation
1. Detected Items screen → tap Generate Recipe
2. `generateRecipes(ingredients, dietFilter)` sends ingredient names to Claude
3. Claude returns 3 structured recipe objects with steps, stats, and badges
4. A new `RecipeSession` is saved to `AppContext` and AsyncStorage
5. App navigates to Recipe Ideas

### Fix an Ingredient
1. Detected Items → tap Fix an ingredient
2. Type or speak a correction (e.g. "Lemon not pomelo")
3. `applyIngredientFix(currentList, instruction)` asks Claude to interpret and apply the fix
4. Ingredient list updates in place
