import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Shimmer sweep overlay. Place inside a View with `overflow: 'hidden'`.
 * The parent should have a background colour (e.g. #E8E6E1) so the gloss
 * strip is visible against the base tone.
 */
export function Shimmer() {
  const x = useSharedValue(-180);

  useEffect(() => {
    x.value = withRepeat(
      withTiming(480, { duration: 1300, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFillObject, animStyle]} pointerEvents="none">
      <LinearGradient
        colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.strip}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  strip: {
    width: 160,
    height: "100%",
  },
});
