import { HarmCategory, HarmBlockThreshold, DynamicRetrievalMode } from "@google/generative-ai";

export const safetyDisabledSettings = [
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

export const defaultTools = {
  webSearch: {
    googleSearchRetrieval: {
      dynamicRetrievalConfig: {
        mode: DynamicRetrievalMode.MODE_DYNAMIC,
        dynamicThreshold: 0.7,
      },
    },
  },
  codeExecution: {
    codeExecution: {},
  },
};
