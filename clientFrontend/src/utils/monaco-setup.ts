import { loader } from "@monaco-editor/react";

// Pre-configure the Monaco loader
loader.config({
  paths: {
    vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs",
  },
  "vs/nls": {
    availableLanguages: {
      "*": "en",
    },
  },
});

// You can add more Monaco configuration here
export const configureMonaco = () => {
  // This function can be used to configure Monaco further
  // For example, register custom languages, themes, etc.
}; 