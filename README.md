# Invoice Summarizer

Small React + Vite app that summarizes invoice text or uploaded invoice files with the Gemini API.

## Features

- Upload an invoice file or paste invoice text
- Extracts vendor, amount due, due date, and key line items
- Shows the result directly in the browser

## Run

```bash
npm install
npm run dev
```

Open the local Vite URL in your browser, then enter your Gemini API key when prompted.

## Notes

- Supported file types: PDF, JPG, JPEG, PNG, DOC, DOCX, TXT
- Files larger than 10 MB are rejected
