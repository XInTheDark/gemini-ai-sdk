import {
  GenerateContentResult,
  GenerateContentStreamResult,
  GenerationConfig,
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  Part,
  SafetySetting,
  Content,
  FileDataPart,
  InlineDataPart,
} from "@google/generative-ai";

import { FileTypeResult, fileTypeFromBuffer } from "file-type";
import mime from "mime-lite";

/**
 * Represents a file to be uploaded.
 */
export type FileUpload = { buffer: ArrayBuffer; filePath: string };

/**
 * Checks if the given data is a FileUpload object.
 * @param data - The data to check.
 * @returns True if the data is a FileUpload, false otherwise.
 */
export function isFileUpload(data: any): data is FileUpload {
  return data && data.buffer && data.filePath;
}

/**
 * Supported file formats for Gemini.
 */
const supportedFileFormats = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/aiff",
  "audio/aac",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/mpeg",
  "video/mov",
  "video/avi",
  "video/x-flv",
  "video/mpg",
  "video/webm",
  "video/wmv",
  "video/3gpp",
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/x-javascript",
  "text/x-typescript",
  "application/x-typescript",
  "text/csv",
  "text/markdown",
  "text/x-python",
  "application/x-python-code",
  "application/json",
  "text/xml",
  "application/rtf",
  "text/rtf",
  "application/pdf",
];

/**
 * Maps some file types to others for compatibility.
 */
const formatMap: { [key: string]: string } = {
  "audio/mpeg": "audio/mp3",
  "video/quicktime": "video/mov",
};

/**
 * Determines the file type of a buffer.
 * @param buffer - The buffer to analyze.
 * @param filePath - Optional file path for fallback.
 * @param options - Options for strict checking.
 * @returns The detected file type.
 */
export const getFileType = async (
  buffer: Uint8Array | ArrayBuffer,
  filePath: string | undefined = undefined,
  { strict = false } = {},
): Promise<string> => {
  const fileType: FileTypeResult | undefined = await fileTypeFromBuffer(buffer);

  let format = formatMap[fileType?.mime as string] || fileType?.mime;
  let valid = supportedFileFormats.includes(format);

  if (!valid && filePath) {
    format = mime.getType(filePath);
    format = formatMap[format] || format;
    valid = supportedFileFormats.includes(format);
  }

  if (!valid) {
    if (strict) {
      throw new Error(
        "Please provide a valid file format that is accepted by Gemini. Learn more about valid formats here: https://ai.google.dev/gemini-api/docs/prompting_with_media?lang=node#supported_file_formats",
      );
    } else {
      format = "text/plain";
    }
  }

  return format;
};

/**
 * Options for initializing a Gemini instance.
 */
export interface GeminiOptions {
  apiVersion?: string;
  fetch?: typeof fetch;
}

/**
 * Options for the `ask` and `askStream` methods.
 */
export interface AskOptions {
  model?: string;
  history?: Content[];
  generationConfig?: GenerationConfig;
  safetySettings?: SafetySetting[];
  systemInstruction?: Content;
}

/**
 * Represents a chat session with Gemini.
 */
export class Chat {
  private gemini: Gemini;
  private history: Content[];
  private options: AskOptions;

  /**
   * Creates a new Chat instance.
   * @param gemini - The Gemini instance to use.
   * @param options - Optional parameters for the chat.
   */
  constructor(gemini: Gemini, options: Partial<AskOptions> = {}) {
    this.gemini = gemini;
    this.history = options.history || [];
    this.options = options;
  }

  /**
   * Appends a message to the chat history.
   * @param message - The message to append.
   */
  public appendMessage(message: Content) {
    this.history.push(message);
  }

  /**
   * Sends a message to Gemini and returns the response.
   * @param message - The message to send.
   * @param options - Optional parameters for the request.
   * @returns The response from Gemini.
   */
  public async ask(message: string | Part[], options: Partial<AskOptions> = {}): Promise<GenerateContentResult> {
    const mergedOptions = { ...this.options, ...options };
    console.log("mergedOptions", mergedOptions);
    console.log("this.history", this.history);
    return this.gemini.ask(message, {
      history: this.history,
      ...mergedOptions,
    });
  }

  /**
   * Sends a message to Gemini and returns a stream of responses.
   * @param message - The message to send.
   * @param options - Optional parameters for the request.
   * @returns A stream of responses from Gemini.
   */
  public async askStream(
    message: string | Part[],
    options: Partial<AskOptions> = {},
  ): Promise<GenerateContentStreamResult> {
    const mergedOptions = { ...this.options, ...options };
    return this.gemini.askStream(message, {
      history: this.history,
      ...mergedOptions,
    });
  }
}

/**
 * Main class for interacting with the Gemini API.
 */
export class Gemini {
  private genAI: GoogleGenerativeAI;
  private options: GeminiOptions;

  /**
   * Creates a new Gemini instance.
   * @param apiKey - Your API key for the Gemini API.
   * @param options - Optional parameters for initializing the instance.
   */
  constructor(apiKey: string, options: Partial<GeminiOptions> = {}) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.options = {
      apiVersion: "v1beta",
      ...options,
    };
  }

  /**
   * Uploads a file to the Gemini API.
   * @param options - Options for the file upload.
   * @returns The URI of the uploaded file.
   */
  private async uploadFile({ file, mimeType }: { file: Uint8Array | ArrayBuffer; mimeType: string }): Promise<string> {
    const gemini = this.genAI;

    function generateBoundary(): string {
      let str = "";
      for (let i = 0; i < 2; i++) {
        str = str + Math.random().toString().slice(2);
      }
      return str;
    }

    const boundary = generateBoundary();
    const apiVersion = this.options.apiVersion;
    const apiKey = gemini.apiKey;

    const generateBlob = (boundary: string, file: Uint8Array | ArrayBuffer, mime: string): Blob =>
      new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=utf-8\r\n\r\n${JSON.stringify({
          file: {
            mimeType: mime,
          },
        })}\r\n--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`,
        file,
        `\r\n--${boundary}--`,
      ]);

    const fileSendDataRaw = await fetch(
      `https://generativelanguage.googleapis.com/upload/${apiVersion}/files?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": `multipart/related; boundary=${boundary}`,
          "X-Goog-Upload-Protocol": "multipart",
        },
        body: generateBlob(boundary, file, mimeType),
      },
    ).then((res: Response) => res.json());

    const fileSendData = fileSendDataRaw.file;

    let waitTime = 250; // Initial wait time in milliseconds
    const MAX_BACKOFF = 5000; // Maximum backoff time in milliseconds

    // Keep polling until the file state is "ACTIVE"
    while (true) {
      try {
        const url = `https://generativelanguage.googleapis.com/${apiVersion}/${fileSendData.name}?key=${apiKey}`;

        const response = await fetch(url, { method: "GET" });
        const data = await response.json();

        if (data.error) {
          throw new Error(`Google's File API responded with an error: ${data.error.message}`);
        }

        if (data.state === "ACTIVE") break;

        await new Promise((resolve) => setTimeout(resolve, waitTime));

        waitTime = Math.min(waitTime * 1.5, MAX_BACKOFF);
      } catch (error) {
        throw new Error(`An error occurred while uploading to Google's File API: ${error.message}`);
      }
    }

    return fileSendData.uri;
  }

  /**
   * Converts a list of messages or files to Gemini API parts.
   * @param messages - The messages or files to convert.
   * @returns An array of Gemini API parts.
   */
  public async messageToParts(messages: (string | Uint8Array | ArrayBuffer | FileUpload)[]): Promise<Part[]> {
    const parts: Part[] = [];
    let totalBytes = 0;

    for (const msg of messages) {
      if (typeof msg === "string") {
        parts.push({ text: msg });
      } else if (msg instanceof ArrayBuffer || msg instanceof Uint8Array || isFileUpload(msg)) {
        const is_file_upload = isFileUpload(msg);
        const buffer = is_file_upload ? msg.buffer : msg;
        const filePath = is_file_upload ? msg.filePath : undefined;

        totalBytes += Buffer.from(buffer).byteLength;
        const mimeType = await getFileType(buffer, filePath);

        if (!mimeType.startsWith("video")) {
          const part: InlineDataPart = {
            inlineData: {
              mimeType: mimeType,
              data: Buffer.from(buffer).toString("base64"),
            },
          };
          parts.push(part);
        } else {
          const fileURI = await this.uploadFile({
            file: buffer,
            mimeType: mimeType,
          });

          const part: FileDataPart = {
            fileData: {
              mimeType: mimeType,
              fileUri: fileURI,
            },
          };
          parts.push(part);
        }
      }
    }

    if (totalBytes > 20 * 1024 * 1024) {
      for (const idx in parts) {
        const part = parts[idx];
        if (part.inlineData) {
          const fileURI = await this.uploadFile({
            file: Buffer.from(part.inlineData.data, "base64"),
            mimeType: part.inlineData.mimeType,
          });
          const newPart: FileDataPart = {
            fileData: {
              mimeType: part.inlineData.mimeType,
              fileUri: fileURI,
            },
          };
          parts[idx] = newPart;
        }
      }
    }

    return parts;
  }

  /**
   * Sends a request to the Gemini API and returns the response.
   * @param message - The message to send.
   * @param options - Optional parameters for the request.
   * @returns The response from the Gemini API.
   */
  public async ask(message: string | Part[], options: Partial<AskOptions> = {}): Promise<GenerateContentResult> {
    const model = this.genAI.getGenerativeModel({ model: options.model }, { apiVersion: this.options.apiVersion });
    const parts = typeof message === "string" ? [{ text: message }] : message;

    const { generationConfig, safetySettings, systemInstruction, history } = options;

    const chat = model.startChat({
      history: history || [],
      generationConfig,
      safetySettings,
      systemInstruction,
    });

    console.log("chat", chat);
    console.log("parts", parts);

    const result = await chat.sendMessage(parts);

    return result;
  }

  /**
   * Sends a request to the Gemini API and returns a stream of responses.
   * @param message - The message to send.
   * @param options - Optional parameters for the request.
   * @returns A stream of responses from the Gemini API.
   */
  public async askStream(
    message: string | Part[],
    options: Partial<AskOptions> = {},
  ): Promise<GenerateContentStreamResult> {
    const model = this.genAI.getGenerativeModel({ model: options.model }, { apiVersion: this.options.apiVersion });
    const parts = typeof message === "string" ? [{ text: message }] : message;

    const { generationConfig, safetySettings, systemInstruction, history } = options;

    const chat = model.startChat({
      history: history || [],
      generationConfig,
      safetySettings,
      systemInstruction,
    });

    console.log("chat", chat);
    console.log("parts", parts);

    const result = await chat.sendMessageStream(parts);

    return result;
  }

  /**
   * Creates a new chat session.
   * @param options - Optional parameters for the chat.
   * @returns A new Chat instance.
   */
  public createChat(options: Partial<AskOptions> = {}): Chat {
    return new Chat(this, options);
  }
}

export default Gemini;

// export constants
import { safetyDisabledSettings } from "./constants";
export { safetyDisabledSettings };