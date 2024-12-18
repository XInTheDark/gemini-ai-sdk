# Gemini AI SDK

### The simpler Google Gemini SDK for TypeScript

![NPM Version](https://img.shields.io/npm/v/gemini-ai-sdk.svg?label=NPM&logo=npm&style=for-the-badge&color=0470FF&logoColor=white)
![NPM Download Count](https://img.shields.io/npm/dt/gemini-ai-sdk?label=Downloads&style=for-the-badge&color=27B2FF)
![Size](https://img.shields.io/bundlephobia/minzip/gemini-ai-sdk?style=for-the-badge&color=B3CAFF)

This package provides a TypeScript wrapper around the official `@google/generative-ai` package, offering a similar structure and feature set to the `gemini-ai` package, but with improved functionality and maintainability. It allows you to easily integrate Google's Gemini AI models into your TypeScript projects, leveraging features like text generation, streaming responses, and chat interactions.

## Features

- **Simplified API:** Provides a simple yet powerful API for interacting with the Gemini AI models.
- **Chat Functionality:** Easily create and manage chat sessions with the Gemini models.
- **Streaming Support:** Get real-time text generation results through streaming responses.
- **File Uploads:** The package takes care of uploading files (images, videos, audio, text documents, etc.) for you! Simply provide a file buffer, and we will handle the rest.
- **Type Safety:** Built with TypeScript, ensuring type safety and better developer experience.
- **Error Handling:** Robust error handling for various scenarios.
- **Tool Support:** Easily configure tools that the model can use, such as web search and code execution.

## Installation

```bash
npm install gemini-ai-sdk
```

## Usage

### Initialization

```typescript
import Gemini, { GeminiOptions } from "gemini-ai-sdk";

// Initialize Gemini with your API key
const gemini = new Gemini("YOUR_API_KEY");

// Optional: Specify additional options
const options: GeminiOptions = {
  apiVersion: "v1beta",
  // You can provide your own fetch implementation if needed
  // fetch: myCustomFetch,
};

const geminiWithOptions = new Gemini("YOUR_API_KEY", options);
```

### Text Generation (ask)

```typescript
import Gemini from "gemini-ai-sdk";

const gemini = new Gemini("YOUR_API_KEY");

async function generateText() {
  const result = await gemini.ask("Write a short story about a cat.");
  console.log(result.response.text());
}

generateText();
```

### Streaming Text Generation

```typescript
import Gemini from "gemini-ai-sdk";

const gemini = new Gemini("YOUR_API_KEY");

async function streamText() {
  const result = await gemini.ask("Tell me a joke.", { stream: true });
  for await (const chunk of result.stream) {
    console.log(chunk.text());
  }
}

streamText();
```

### Chat Interaction

```typescript
import Gemini from "gemini-ai-sdk";

const gemini = new Gemini("YOUR_API_KEY");

async function runChat() {
  const chat = gemini.createChat({
    history: [
      {
        role: "user",
        parts: [{ text: "Hello, how are you?" }],
      },
      {
        role: "model",
        parts: [{ text: "I am doing well, thank you. How can I help you today?" }],
      },
    ],
  });

  // Get the response from a user message
  const result1 = await chat.ask("What is the capital of France?");
  console.log("Model:", result1.response.text());
  chat.appendMessage({
    role: "user",
    parts: [{ text: "What is the capital of France?" }],
  });
  chat.appendMessage({
    role: "model",
    parts: [{ text: result1.response.text() }],
  });

  // Get a streaming response from a user message
  const result2 = await chat.ask("Tell me a story about a dog.", { stream: true });
  console.log("Model (streaming):");
  for await (const chunk of result2.stream) {
    process.stdout.write(chunk.text());
  }
  console.log();

  chat.appendMessage({
    role: "user",
    parts: [{ text: "Tell me a story about a dog." }],
  });
  const fullResponse = await result2.response;
  chat.appendMessage({
    role: "model",
    parts: [{ text: fullResponse.text() }],
  });
}

runChat();
```

### File Uploads

```typescript
import Gemini from "gemini-ai-sdk";
import * as fs from "fs";

const gemini = new Gemini("YOUR_API_KEY");

async function uploadImageAndAsk() {
  const imageBuffer = fs.readFileSync("path/to/your/image.jpg");

  const fileUpload: FileUpload = {
    buffer: imageBuffer,
    filePath: "path/to/your/image.jpg",
  };

  // Send the file directly without providing the filePath in the object
  const result = await gemini.ask([{ text: "Describe this image" }, fileUpload]);
  console.log(result.response.text());
}

uploadImageAndAsk();
```

## API Reference

### `Gemini` Class

- **`constructor(apiKey: string, options?: Partial<GeminiOptions>)`**

  - `apiKey`: Your Gemini API key.
  - `options`: Optional configuration options.
    - `apiVersion`: The API version to use (default: `"v1beta"`).
    - `fetch`: A custom fetch implementation (optional).

- **`ask(message: string | Part[], options?: Partial<AskOptions>): Promise<GenerateResult>`**

  - `message`: The prompt string or an array of `Part` objects (for multi-modal input).
  - `options`: Optional parameters.

    - `stream`: Whether to stream the response (default: `false`).
    - `history`: An array of previous chat turns.
    - `generationConfig`: Configuration for text generation (temperature, `maxOutputTokens`, etc.).
    - `safetySettings`: Safety settings to filter responses.
    - `systemInstruction`: System instructions to guide the model's behavior.
    - `tools`: Tools that the model can call. The format is as per the Gemini API documentation.

  - Returns a `Promise` that resolves to a `GenerateContentResult` object (if not streaming),
    or a `GenerateContentStreamResult` object (if streaming).

### `Chat` Class

- **`constructor(gemini: Gemini, options?: Partial<AskOptions>)`**

  - `gemini`: The `Gemini` instance to use.
  - `options`: Optional parameters for the chat.

- **`appendMessage(message: Content)`**

  - `message`: The `Content` object representing the message to append to the history.

- **`ask(message: string | Part[], options?: Partial<AskOptions>): Promise<GenerateResult>`**

  - Same as the `Gemini.ask` method, but uses the chat's history.

### Types

- **`FileUpload`:** `{ buffer: ArrayBuffer, filePath: string }`
- **`GeminiOptions`:** `{ apiVersion?: string, fetch?: typeof fetch }`
- **`AskOptions`:** `{ generationConfig?: GenerationConfig, safetySettings?: SafetySetting[], systemInstruction?: Content }`
- **`Content`:** `{ role: string, parts: Part[] }`
- **`Part`:** `TextPart | InlineDataPart | FileDataPart`
- Heavily based on types from the `@google/generative-ai` package

### Constants

- `safetyDisabledSettings`: The most permissive safety settings.
- `defaultTools`: Some default tools to get you started.

Example:

```typescript
import { constants } from "gemini-ai-sdk";
console.log(constants.defaultTools);
```

## Error Handling

The package handles errors gracefully and throws appropriate exceptions when necessary. These include errors related to:

- Invalid API key
- Network issues
- API errors (e.g., exceeding rate limits)
- File upload errors
- Safety violations (if configured)

## Support

The official `@google/generative-ai` package, which this SDK is based on, officially supports Node.js 18.x and above.
However, the package requires the Fetch API to be available, so it may not work in some environments. If you encounter
issues, please try using the polyfill `undici`. Example:

```typescript
import { fetch, Headers, Response, Request } from "undici";
global.fetch = fetch;
global.Headers = Headers;
global.Response = Response;
global.Request = Request;
```

## Contributing

Contributions are welcome! Please feel free to open issues or pull requests on the GitHub repository.

## License

This project is licensed under the GPLv3 License - see the LICENSE file for details.
