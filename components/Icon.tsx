import React from "react";
import {
  Ionicons,
  MaterialCommunityIcons,
  Feather,
} from "@expo/vector-icons";

type IconProps = {
  icon: string;
  size?: number;
  color?: string;
};

type IconMapping = {
  set: "Ionicons" | "MaterialCommunityIcons" | "Feather";
  name: string;
};

const ICON_MAP: Record<string, IconMapping> = {
  "solar:leaf-bold": { set: "Ionicons", name: "leaf" },
  "solar:bone-bold": { set: "MaterialCommunityIcons", name: "bone" },
  "solar:fire-bold": { set: "Ionicons", name: "flame" },
  "solar:pen-new-square-bold-duotone": { set: "Feather", name: "edit-3" },
  "solar:scanner-2-bold-duotone": { set: "Ionicons", name: "scan" },
  "solar:microphone-3-bold": { set: "Ionicons", name: "mic" },
  "solar:soundwave-bold": { set: "MaterialCommunityIcons", name: "waveform" },
  "solar:check-circle-bold": { set: "Ionicons", name: "checkmark-circle" },
  "solar:alt-arrow-left-linear": { set: "Ionicons", name: "arrow-back" },
  "solar:add-circle-linear": { set: "Ionicons", name: "add-circle-outline" },
  "hugeicons:cancel-01": { set: "Ionicons", name: "close" },
  "solar:magic-stick-3-bold": { set: "MaterialCommunityIcons", name: "auto-fix" },
  "solar:clock-circle-bold": { set: "Ionicons", name: "time-outline" },
  "solar:heart-bold": { set: "Ionicons", name: "heart" },
  "solar:heart-outline": { set: "Ionicons", name: "heart-outline" },
  "solar:play-circle-bold": { set: "Ionicons", name: "play-circle" },
  "solar:alt-arrow-right-linear": { set: "Ionicons", name: "arrow-forward" },
  "solar:send-bold": { set: "Ionicons", name: "send" },
  "solar:bookmark-bold": { set: "Ionicons", name: "bookmark" },
  "solar:bookmark-outline": { set: "Ionicons", name: "bookmark-outline" },
  "solar:history-bold": { set: "MaterialCommunityIcons", name: "history" },
  "solar:camera-bold": { set: "Ionicons", name: "camera" },
  "solar:chef-hat-bold": { set: "MaterialCommunityIcons", name: "chef-hat" },
  "solar:lightbulb-bold": { set: "Ionicons", name: "bulb" },
};

export function Icon({ icon, size = 20, color = "#000" }: IconProps) {
  const mapping = ICON_MAP[icon];
  if (!mapping) return null;

  switch (mapping.set) {
    case "Ionicons":
      return (
        <Ionicons name={mapping.name as any} size={size} color={color} />
      );
    case "MaterialCommunityIcons":
      return (
        <MaterialCommunityIcons
          name={mapping.name as any}
          size={size}
          color={color}
        />
      );
    case "Feather":
      return (
        <Feather name={mapping.name as any} size={size} color={color} />
      );
    default:
      return null;
  }
}
