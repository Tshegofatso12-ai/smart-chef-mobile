export type DietFilter = "low-fat" | "low-carb" | "high-protein";

export type Ingredient = {
  id: string;
  name: string;
  subtitle: string;
  image: string;
  wide: boolean;
  badge?: string;
};

export type RecipeStat = {
  icon: string;
  iconColor: string;
  label: string;
  value: string;
};

export type RecipeBadge = {
  label: string;
  color: string;
  bg: string;
};

export type Recipe = {
  id: string;
  title: string;
  cookTime: string;
  calories: string;
  dietMatch: DietFilter;
  badges: RecipeBadge[];
  stats: RecipeStat[];
  ingredients: string[];
  steps: string[];
  gradientColors: [string, string];
};

export type RecipeSession = {
  id: string;
  createdAt: number;
  ingredients: Ingredient[];
  dietFilter: DietFilter;
  recipes: Recipe[];
};

export type SavedRecipeEntry = {
  recipeId: string;
  sessionId: string;
  savedAt: number;
};

export type AppContextValue = {
  activeSession: RecipeSession | null;
  setActiveSession: (session: RecipeSession) => void;
  sessions: RecipeSession[];
  savedRecipeIds: SavedRecipeEntry[];
  addSession: (session: RecipeSession) => Promise<void>;
  toggleSaved: (recipeId: string, sessionId: string) => Promise<void>;
  isRecipeSaved: (recipeId: string) => boolean;
  trayIngredients: Ingredient[];
  setTrayIngredients: (ingredients: Ingredient[]) => void;
  activeDietFilter: DietFilter;
  setActiveDietFilter: (filter: DietFilter) => void;
};
