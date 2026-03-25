import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";
import type { CookingSkill, DietFilter } from "@/types";

type SkillDef = {
  id: CookingSkill;
  label: string;
  desc: string;
  icon: string;
  emoji: string;
};

const SKILLS: SkillDef[] = [
  {
    id: "beginner",
    label: "Beginner",
    desc: "New to cooking — keep it simple and quick",
    icon: "solar:star-outline",
    emoji: "🌱",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    desc: "Comfortable with most home cooking techniques",
    icon: "solar:star-bold",
    emoji: "🍳",
  },
  {
    id: "advanced",
    label: "Advanced",
    desc: "Experienced cook who loves complex preparations",
    icon: "solar:chef-hat-bold",
    emoji: "👨‍🍳",
  },
];

export default function SkillScreen() {
  const { preferences, allergies } = useLocalSearchParams<{
    preferences?: string;
    allergies?: string;
  }>();
  const [selected, setSelected] = useState<CookingSkill>("intermediate");
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const dietary_preferences: DietFilter[] = preferences
        ? JSON.parse(preferences)
        : [];
      const allergiesList: string[] = allergies ? JSON.parse(allergies) : [];

      const { error } = await supabase
        .from("profiles")
        .update({
          dietary_preferences,
          allergies: allergiesList,
          cooking_skill: selected,
          onboarding_complete: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      router.replace("/");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Could not save preferences.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progress}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.dot, styles.dotActive]} />
            ))}
          </View>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Cooking Skill</Text>
          <Text style={styles.subtitle}>
            We'll tailor recipe complexity to match your level.
          </Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {SKILLS.map((skill) => {
            const isSelected = selected === skill.id;
            return (
              <Pressable
                key={skill.id}
                onPress={() => setSelected(skill.id)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.optionIconBox,
                    isSelected && styles.optionIconBoxSelected,
                  ]}
                >
                  <Text style={styles.optionEmoji}>{skill.emoji}</Text>
                </View>

                <View style={styles.optionBody}>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                    ]}
                  >
                    {skill.label}
                  </Text>
                  <Text style={styles.optionDesc}>{skill.desc}</Text>
                </View>

                <View
                  style={[
                    styles.radio,
                    isSelected && styles.radioSelected,
                  ]}
                >
                  {isSelected && <View style={styles.radioDot} />}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.88 : 1 },
            ]}
            onPress={handleFinish}
            disabled={loading}
          >
            <LinearGradient
              colors={["#34D399", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryGradient}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Let's Cook!</Text>
                  <Icon icon="solar:chef-hat-bold" size={20} color="#FFFFFF" />
                </>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F6F0" },
  safe: { flex: 1, paddingHorizontal: 24 },

  header: { paddingTop: 12, paddingBottom: 24 },
  progress: { flexDirection: "row", gap: 6, marginBottom: 20 },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#E8E6E1" },
  dotActive: { backgroundColor: "#059669" },
  step: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: "#059669",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 32,
    color: "#2C332A",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    lineHeight: 20,
  },

  options: { flex: 1, gap: 12 },

  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  optionSelected: {
    borderColor: "#059669",
    backgroundColor: "rgba(5,150,105,0.06)",
  },
  optionIconBox: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#F0EFEA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  optionIconBoxSelected: {
    backgroundColor: "#059669",
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionBody: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: "#2C332A",
  },
  optionLabelSelected: {
    color: "#059669",
  },
  optionDesc: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
    lineHeight: 16,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E2DFD8",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioSelected: {
    borderColor: "#059669",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#059669",
  },

  footer: { paddingTop: 12, paddingBottom: 8 },
  primaryButton: {
    borderRadius: 999,
    overflow: "hidden",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 56,
  },
  primaryButtonText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
