import firebaseRulesPlugin from "@firebase/eslint-plugin-security-rules";

export default [
  {
    ignores: ["dist/**/*", "node_modules/**/*", ".gmp_cache/**/*", "native/**/*"],
  },
  firebaseRulesPlugin.configs["flat/recommended"],
];
