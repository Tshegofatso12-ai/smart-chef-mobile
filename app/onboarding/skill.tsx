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
import { supabase } from "@/lib/supabase";
import { Icon } from "@/components/Icon";
import type { CookingSkill, DietFilter } from "@/types";

type SkillDef = {
  id: CookingSkill;
  label: string;
  desc: string;
  icon: string;
};

const SKILLS: SkillDef[] = [
  {
    id: "beginner",
    label: "Beginner",
    desc: "New to cooking — keep it simple and quick",
    icon: "solar:star-outline",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    desc: "Comfortable with most home cooking techniques",
    icon: "solar:star-bold",
  },
  {
    id: "advanced",
    label: "Advanced",
    desc: "Experienced cook who loves complex preparations",
    icon: "solar:chef-hat-bold",
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
        {/* Progress */}
        <View style={styles.progress}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={styles.dotActive} />
          ))}
        </View>

        <Text style={styles.step}>Step 3 of 3</Text>
        <Text style={styles.title}>Cooking Skill</Text>
        <Text style={styles.subtitle}>
          We'll tailor recipe complexity to match your level.
        </Text>

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
                    styles.optionIcon,
                    isSelected && styles.optionIconSelected,
                  ]}
                >
                  <Icon
                    icon={skill.icon}
                    size={24}
                    color={isSelected ? "#FFFFFF" : "#7B8579"}
                  />
                </View>
                <View style={{ flex: 1 }}>
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

        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={handleFinish}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryButtonText}>Let's Cook!</Text>
                <Icon
                  icon="solar:chef-hat-bold"
                  size={20}
                  color="#FFFFFF"
                />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F6F0" },
  safe: { flex: 1, paddingHorizontal: 28 },
  progress: { flexDirection: "row", gap: 6, marginTop: 12, marginBottom: 20 },
  dotActive: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#059669",
  },
  step: {
    fontFamily: "NunitoSans_600SemiBold",
    fontSize: 12,
    color: "#059669",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 28,
    color: "#2C332A",
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 14,
    color: "#7B8579",
    marginBottom: 28,
    lineHeight: 20,
  },
  options: { gap: 12, flex: 1, alignContent: "flex-start" },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  optionSelected: {
    borderColor: "#059669",
    backgroundColor: "rgba(5,150,105,0.06)",
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "#F0EFEA",
    alignItems: "center",
    justifyContent: "center",
  },
  optionIconSelected: {
    backgroundColor: "#059669",
  },
  optionLabel: {
    fontFamily: "NunitoSans_700Bold",
    fontSize: 16,
    color: "#2C332A",
    marginBottom: 3,
  },
  optionLabelSelected: {
    color: "#059669",
  },
  optionDesc: {
    fontFamily: "NunitoSans_400Regular",
    fontSize: 12,
    color: "#7B8579",
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#E2DFD8",
    alignItems: "center",
    justifyContent: "center",
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
  footer: { paddingBottom: 16, marginTop: 20 },
  primaryButton: {
    height: 56,
    borderRadius: 999,
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontFamily: "NunitoSans_800ExtraBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
