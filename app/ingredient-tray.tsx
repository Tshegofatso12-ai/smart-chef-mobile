import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { useAppContext } from "@/context/AppContext";
import { generateRecipes } from "@/lib/claude";
import type { Ingredient, RecipeSession } from "@/types";

const COLORS = {
  background: "#F9F6F0",
  foreground: "#2C332A",
  primary: "#8A9A86",
  primaryForeground: "#FFFFFF",
  card: "#FFFFFF",
  muted: "#E8E6E1",
  mutedForeground: "#7B8579",
  border: "#E2DFD8",
  destructive: "#C97A7E",
};

const INITIAL_INGREDIENTS: Ingredient[] = [
  {
    id: "1",
    name: "Spinach",
    subtitle: "Fresh Leaves",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/OPHrdYQYloS.png",
    wide: false,
  },
  {
    id: "2",
    name: "Chicken",
    subtitle: "Lean Breast",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/generation-assets/placeholder/square.png",
    wide: false,
  },
  {
    id: "3",
    name: "Cherry Tomatoes",
    subtitle: "Ripe & Sweet",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/qsge76Yy1pd.png",
    wide: true,
    badge: "Antioxidant Rich",
  },
  {
    id: "4",
    name: "Red Onion",
    subtitle: "Whole Bulb",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/WG28jaAmW65.png",
    wide: false,
  },
  {
    id: "5",
    name: "Garlic",
    subtitle: "Fresh Clove",
    image:
      "https://ggrhecslgdflloszjkwl.supabase.co/storage/v1/object/public/user-assets/IXNk5Fj0Ara/components/HtoW8pmfzGR.png",
    wide: false,
  },
];

function SmallCard({
  item,
  onRemove,
}: {
  item: Ingredient;
  onRemove: () => void;
}) {
  return (
    <View style={[styles.card, { flex: 1 }]}>
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeButton,
          { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
        ]}
      >
        <Icon icon="hugeicons:cancel-01" size={16} color={COLORS.destructive} />
      </Pressable>
      <View style={styles.cardImage}>
        <Image
          source={{ uri: item.image }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </View>
      <View style={{ paddingHorizontal: 4 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

function WideCard({
  item,
  onRemove,
}: {
  item: Ingredient;
  onRemove: () => void;
}) {
  return (
    <View style={styles.card}>
      <Pressable
        onPress={onRemove}
        style={({ pressed }) => [
          styles.removeButton,
          { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.9 : 1 }] },
        ]}
      >
        <Icon icon="hugeicons:cancel-01" size={16} color={COLORS.destructive} />
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 20 }}>
        <View style={styles.wideCardImage}>
          <Image
            source={{ uri: item.image }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardName, { fontSize: 18 }]}>{item.name}</Text>
          <Text style={[styles.cardSubtitle, { fontSize: 13, marginBottom: 8 }]}>
            {item.subtitle}
          </Text>
          {item.badge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.badge}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function IngredientTrayScreen() {
  const { trayIngredients, activeDietFilter, addSession } = useAppContext();
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    trayIngredients.length > 0 ? trayIngredients : INITIAL_INGREDIENTS
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const removeIngredient = (id: string) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGenerateRecipe = async () => {
    if (ingredients.length === 0) {
      Alert.alert("No Ingredients", "Please add at least one ingredient to generate a recipe.");
      return;
    }

    setIsGenerating(true);
    try {
      const recipes = await generateRecipes(ingredients, activeDietFilter);
      const session: RecipeSession = {
        id: `session-${Date.now()}`,
        createdAt: Date.now(),
        ingredients,
        dietFilter: activeDietFilter,
        recipes,
      };
      addSession(session);
      router.push("/recipe-ideas");
    } catch (err) {
      Alert.alert("Error", "Failed to generate recipes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Build rows for the mixed grid
  const renderGrid = () => {
    const rows: React.ReactNode[] = [];
    let i = 0;

    while (i < ingredients.length) {
      const item = ingredients[i];

      if (item.wide) {
        rows.push(
          <WideCard key={item.id} item={item} onRemove={() => removeIngredient(item.id)} />
        );
        i += 1;
      } else {
        const nextItem = ingredients[i + 1];
        const isNextWide = nextItem?.wide ?? true;

        if (!isNextWide && nextItem) {
          rows.push(
            <View key={`row-${item.id}`} style={{ flexDirection: "row", gap: 16 }}>
              <SmallCard item={item} onRemove={() => removeIngredient(item.id)} />
              <SmallCard item={nextItem} onRemove={() => removeIngredient(nextItem.id)} />
            </View>
          );
          i += 2;
        } else {
          rows.push(
            <View key={`row-${item.id}`} style={{ flexDirection: "row", gap: 16 }}>
              <SmallCard item={item} onRemove={() => removeIngredient(item.id)} />
              <View style={{ flex: 1 }} />
            </View>
          );
          i += 1;
        }
      }
    }

    return rows;
  };

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Icon icon="solar:alt-arrow-left-linear" size={22} color={COLORS.foreground} />
          </Pressable>

          <Text style={styles.headerTitle}>Detected Items</Text>

          <Pressable
            style={({ pressed }) => [
              styles.headerButton,
              { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Icon icon="solar:add-circle-linear" size={22} color={COLORS.foreground} />
          </Pressable>
        </View>

        {/* Ingredient Grid */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 24, gap: 16, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {ingredients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No ingredients detected.</Text>
              <Text style={styles.emptySubtext}>Tap the + button to add ingredients manually.</Text>
            </View>
          ) : (
            renderGrid()
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Generate Recipe Button */}
      <LinearGradient
        colors={["transparent", "rgba(249,246,240,0.95)", "#F9F6F0"]}
        style={styles.bottomGradient}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={handleGenerateRecipe}
          style={({ pressed }) => [
            styles.generateButton,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <Text style={styles.generateButtonText}>Generate Recipe</Text>
          <Icon icon="solar:magic-stick-3-bold" size={24} color={COLORS.primaryForeground} />
        </Pressable>
      </LinearGradient>

      <LoadingOverlay visible={isGenerating} message="Crafting your recipes..." />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.6)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  headerTitle: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 19,
    color: "#2C332A",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(201,122,126,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  cardImage: {
    height: 128,
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E8E6E1",
    marginBottom: 14,
  },
  wideCardImage: {
    height: 128,
    width: 148,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#E8E6E1",
    flexShrink: 0,
  },
  cardName: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: "#2C332A",
  },
  cardSubtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 11,
    color: "#7B8579",
    marginTop: 2,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(138,154,134,0.12)",
  },
  badgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    color: "#8A9A86",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: "#2C332A",
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 13,
    color: "#7B8579",
    textAlign: "center",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 24,
  },
  generateButton: {
    width: "100%",
    height: 64,
    borderRadius: 24,
    backgroundColor: "#8A9A86",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    shadowColor: "#8A9A86",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  generateButtonText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 17,
    color: "#FFFFFF",
  },
});
