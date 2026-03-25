import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Icon } from "@/components/Icon";
import { useAppContext } from "@/context/AppContext";
import type { Recipe } from "@/types";

export function RecipeRow({
  recipe,
  sessionId,
  isSaved,
}: {
  recipe: Recipe;
  sessionId: string;
  isSaved?: boolean;
}) {
  const { toggleSaved } = useAppContext();

  return (
    <TouchableOpacity
      onPress={() =>
        router.push({ pathname: "/recipe/[id]", params: { id: recipe.id, sessionId } })
      }
      style={s.card}
      activeOpacity={0.9}
    >
      <View style={{ flex: 1, gap: 6, paddingRight: 48 }}>
        <Text style={s.title} numberOfLines={2}>{recipe.title}</Text>
        <View style={s.meta}>
          <View style={s.metaItem}>
            <Icon icon="solar:fire-bold" size={13} color="#C97A7E" />
            <Text style={s.metaText}>{recipe.calories}</Text>
          </View>
          <View style={s.metaItem}>
            <Icon icon="solar:clock-circle-bold" size={13} color="#DDA77B" />
            <Text style={s.metaText}>{recipe.cookTime}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => toggleSaved(recipe.id, sessionId)}
        style={s.bookmarkBtn}
        activeOpacity={0.8}
      >
        <Icon
          icon={isSaved ? "solar:bookmark-bold" : "solar:bookmark-outline"}
          size={20}
          color="#059669"
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(226,223,216,0.5)",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#2C332A",
    lineHeight: 20,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 12,
    color: "#7B8579",
  },
  bookmarkBtn: {
    position: "absolute",
    right: 16,
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(5,150,105,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
});
