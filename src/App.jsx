import { useState, useEffect, useRef } from "react";
import { create } from "zustand";
import "./App.css";

const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Get base64 data part (remove metadata prefix)
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const useStore = create((set) => ({
  invoiceText: "",
  setInvoiceText: (text) => set({ invoiceText: text }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
  chatMessages: [],
  addMessage: (message) =>
    set((state) => ({
      chatMessages: [...state.chatMessages, message],
    })),
  clearMessages: () => set({ chatMessages: [] }),
  file: null,
  setFile: (file) => set({ file }),
}));

function App() {
  const {
    invoiceText,
    setInvoiceText,
    isLoading,
    setIsLoading,
    chatMessages,
    addMessage,
    clearMessages,
    file,
    setFile,
  } = useStore();

  const [apiKey, setApiKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const fileInputRef = useRef(null);

  const processInvoice = async () => {
    if (!invoiceText.trim() && !file) {
      alert("Please paste invoice text or upload a file");
      return;
    }

    if (!apiKey) {
      setShowKeyInput(true);
      return;
    }

    setIsLoading(true);

    const userMessage = file
      ? `Please summarize this invoice from file: ${file.name}`
      : "Please summarize this invoice text";

    addMessage({
      role: "user",
      content: userMessage,
    });

    try {
      const prompt = `
        Extract and summarize the following invoice information in a clear, structured format:
        1. Vendor name
        2. Total amount due
        3. Due date
        4. Key line items (up to 5 most important ones)
      `;

      let requestBody;

      if (file) {
        const fileBase64 = await convertToBase64(file);

        requestBody = {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: file.type,
                    data: fileBase64,
                  },
                },
              ],
            },
          ],
        };
      } else {
        requestBody = {
          contents: [
            {
              parts: [
                {
                  text: `${prompt}\n\nHere is the invoice text:\n${invoiceText}`,
                },
              ],
            },
          ],
        };
      }

      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
          apiKey,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || "Failed to process invoice");
      }

      const content =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "Could not parse the response";

      addMessage({
        role: "assistant",
        content: content,
      });
    } catch (error) {
      console.error("Error processing invoice:", error);

      addMessage({
        role: "assistant",
        content: `Error: ${
          error.message || "Failed to process the invoice. Please try again."
        }`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInvoiceText("");
    setFile(null);
    clearMessages();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        alert("File too large (max 10MB)");
        e.target.value = "";
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white text-black">
      <main className="flex-grow container mx-auto p-4 max-w-4xl flex flex-col items-center">
        <h1 className="text-3xl font-bold text-yellow-500 mb-8 text-center">
          AI Invoice Summarizer
        </h1>

        {showKeyInput && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
            <div className="bg-white p-6 rounded-lg shadow-yellow-400/20 shadow-lg max-w-md w-full">
              <h2 className="text-xl font-semibold text-yellow-600 mb-4">
                Enter Gemini API Key
              </h2>
              <p className="text-gray-700 mb-4 text-sm">
                Your API key is required to use the Gemini AI service. It will
                only be stored in your browser's memory.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste your Gemini API key here"
                className="w-full p-2 mb-4 bg-white border border-gray-300 rounded text-black focus:outline-none focus:border-yellow-500"
              />
              <div className="flex justify-end space-x-3">
                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  onClick={() => setShowKeyInput(false)}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 font-medium"
                  onClick={() => {
                    if (apiKey.trim()) {
                      setShowKeyInput(false);
                      processInvoice();
                    } else {
                      alert("Please enter an API key");
                    }
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-yellow-50 p-6 rounded-lg shadow-md mb-8 w-full">
          <div className="mb-4">
            <label className="block text-yellow-700 font-medium mb-2">
              Upload Invoice File
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="block w-full text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-yellow-100 file:text-yellow-700 hover:file:bg-yellow-200"
            />
            {file && (
              <div className="mt-2 text-sm text-gray-600">
                Selected file: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>

          <div className="my-4 text-center text-gray-500">-- OR --</div>

          <label className="block text-yellow-700 font-medium mb-2">
            Paste Invoice Text
          </label>
          <textarea
            value={invoiceText}
            onChange={(e) => setInvoiceText(e.target.value)}
            placeholder="Paste your invoice text here..."
            className="w-full h-32 p-3 bg-white text-gray-800 rounded border border-yellow-200 focus:outline-none focus:border-yellow-400 resize-none mb-4"
          />
          <div className="flex justify-between">
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              disabled={isLoading}
            >
              Clear
            </button>
            <button
              onClick={processInvoice}
              className="px-4 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-400 font-medium transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                "Summarize Invoice"
              )}
            </button>
          </div>
        </div>

        {chatMessages.length > 0 && (
          <div className="bg-white border border-yellow-200 rounded-lg shadow-md overflow-hidden w-full max-w-3xl mx-auto">
            <div className="p-4 bg-yellow-500 text-black font-medium">
              Invoice Summary
            </div>
            <div className="p-6 max-h-96 overflow-y-auto">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-6 ${
                    message.role === "user" ? "opacity-75" : ""
                  }`}
                >
                  <div className="font-semibold text-sm text-yellow-600 mb-2">
                    {message.role === "user" ? "You" : "AI Assistant"}:
                  </div>
                  <div className="whitespace-pre-line text-gray-800">
                    {message.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-center items-center py-4">
                  <div className="w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="py-3 text-center text-sm text-gray-500 border-t border-gray-200">
        Aitore Nurkali, ID: 240103049
      </footer>
    </div>
  );
}

export default App;
