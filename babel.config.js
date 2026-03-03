module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
    ],
    plugins: [
      // Include nativewind's CSS plugin without the react-native-worklets
      // requirement (which is only needed for Reanimated 4, not 3.x)
      require("react-native-css-interop/dist/babel-plugin").default,
    ],
  };
};
