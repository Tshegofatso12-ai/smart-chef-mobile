import React, { useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Icon } from "@/components/Icon";
import { Shimmer } from "@/components/Shimmer";
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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const unsplashUrl = `https://source.unsplash.com/featured/?${encodeURIComponent(
    recipe.title
  )},food`;

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: "/recipe/[id]",
          params: { id: recipe.id, sessionId },
        })
      }
      style={({ pressed }) => [
        styles.recipeRow,
        { opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {/* Image */}
      <View style={[styles.rowSwatch, { overflow: "hidden" }]}>
        <LinearGradient
          colors={recipe.gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {!imageError && (
          <Image
            source={{ uri: unsplashUrl }}
            style={[
              StyleSheet.absoluteFillObject,
              { opacity: imageLoaded ? 1 : 0 },
            ]}
            resizeMode="cover"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}

        {!imageLoaded && !imageError && <Shimmer />}
      </View>

      {/* Text */}
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {recipe.title}
        </Text>

        <View style={styles.rowMeta}>
          {recipe.badges[0] && (
            <View
              style={[
                styles.rowBadge,
                { backgroundColor: recipe.badges[0].bg },
              ]}
            >
              <Text
                style={[
                  styles.rowBadgeText,
                  { color: recipe.badges[0].color },
                ]}
              >
                {recipe.badges[0].label}
              </Text>
            </View>
          )}

          <Text style={styles.rowStat}>{recipe.cookTime}</Text>
          <Text style={styles.rowStat}>·</Text>
          <Text style={styles.rowStat}>{recipe.calories}</Text>
        </View>
      </View>

      {/* Bookmark top-right */}
      {isSaved && (
        <View style={styles.bookmarkBadge}>
          <Icon icon="solar:bookmark-bold" size={28} color="#8A9A86" />
        </View>
      )}
    </Pressable>
  );
}

export const styles = StyleSheet.create({
  recipeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 22,
    gap: 14,
    position: "relative",
  },
  rowSwatch: {
    width: 56,
    height: 56,
    borderRadius: 18,
    flexShrink: 0,
  },
  rowInfo: {
    flex: 1,
    gap: 6,
    paddingRight: 50,
  },
  rowTitle: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 15,
    color: "#2C332A",
    marginBottom: 1,
    marginTop: 5,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  rowBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  rowBadgeText: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowStat: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
  },
  bookmarkBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
