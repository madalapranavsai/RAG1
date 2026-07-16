import { createAdminClient } from "@/utils/supabase/admin";
import { chunkText } from "./chunker";
import { PDFParse } from "pdf-parse";
import { generateEmbeddings } from "@/utils/embeddings";

/**
 * Downloads a document from storage, extracts its text content, chunks it,
 * saves the chunks to the database, and updates the document status.
 *
 * @param documentId UUID of the document to process.
 */
export async function processDocument(documentId: string) {
  const supabase = createAdminClient();

  try {
    // 1. Update status to 'processing'
    const { error: statusError } = await supabase
      .from("documents")
      .update({ status: "processing", error_message: null })
      .eq("id", documentId);

    if (statusError) {
      throw new Error(`Failed to update status to processing: ${statusError.message}`);
    }

    // 2. Fetch document record
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (fetchError || !document) {
      throw new Error(
        `Failed to retrieve document: ${fetchError?.message || "Not found"}`
      );
    }

    // 3. Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("documents")
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(
        `Failed to download file from storage: ${
          downloadError?.message || "No data"
        }`
      );
    }

    // 4. Extract raw text
    let extractedText = "";
    const buffer = Buffer.from(await fileData.arrayBuffer());

    if (document.mime_type === "application/pdf") {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      extractedText = textResult.text;
      await parser.destroy(); // Free parser memory resources
    } else {
      // Text or Markdown files
      extractedText = buffer.toString("utf-8");
    }

    // Normalize text (handling CRLF endings and excessive white spaces)
    extractedText = extractedText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();

    if (!extractedText) {
      throw new Error("No readable text could be extracted from the file.");
    }

    // 5. Partition text into overlapping chunks
    const chunks = chunkText(extractedText);

    if (chunks.length === 0) {
      throw new Error("Text chunking resulted in 0 segments.");
    }

    // Generate embeddings for each text chunk
    const chunkContents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(chunkContents);

    // 6. Bulk insert chunks into the database (attaching the vector arrays)
    const chunkRows = chunks.map((chunk, idx) => ({
      workspace_id: document.workspace_id,
      document_id: document.id,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      embedding: embeddings[idx],
    }));

    const { error: insertError } = await supabase
      .from("document_chunks")
      .insert(chunkRows);

    if (insertError) {
      throw new Error(`Failed to save document chunks: ${insertError.message}`);
    }

    // 7. Update status to 'ready'
    const { error: readyError } = await supabase
      .from("documents")
      .update({ status: "ready" })
      .eq("id", documentId);

    if (readyError) {
      throw new Error(`Failed to update status to ready: ${readyError.message}`);
    }

    // 8. Track usage metrics (chunks created and embeddings generated)
    await supabase.from("usage_events").insert([
      {
        workspace_id: document.workspace_id,
        event_type: "chunk_created",
        quantity: chunks.length,
        metadata: { document_id: documentId },
      },
      {
        workspace_id: document.workspace_id,
        event_type: "embedding_generated",
        quantity: chunks.length,
        metadata: { document_id: documentId },
      },
    ]);

  } catch (err: any) {
    console.error(`Error processing document ${documentId}:`, err);

    // Save failure logs to help users debug parsing failures
    await supabase
      .from("documents")
      .update({
        status: "failed",
        error_message: err.message || "An unexpected processing error occurred.",
      })
      .eq("id", documentId);
  }
}
