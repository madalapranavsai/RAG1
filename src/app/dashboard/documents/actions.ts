"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { processDocument } from "@/utils/ingestion/processor";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
];

export async function uploadDocument(prevState: any, formData: FormData) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in to upload files." };
    }

    // 2. Fetch user's active workspace
    const { data: memberships } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    const activeWorkspaceId = memberships?.[0]?.workspace_id;

    if (!activeWorkspaceId) {
      return { error: "No active workspace found for your account." };
    }

    // 3. Retrieve and validate the file
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { error: "Please select a valid file to upload." };
    }

    if (file.size > MAX_FILE_SIZE) {
      return { error: "File exceeds the maximum 2MB size limit." };
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        error: "Invalid file type. Only PDF, TXT, and Markdown files are supported.",
      };
    }

    // 4. Generate document ID and build path
    const documentId = crypto.randomUUID();
    const cleanFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `workspaces/${activeWorkspaceId}/documents/${documentId}/${cleanFilename}`;

    // 5. Convert file to buffer and upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { error: `Failed to upload file to storage: ${uploadError.message}` };
    }

    // 6. Insert metadata into database
    const { error: dbError } = await supabase.from("documents").insert({
      id: documentId,
      workspace_id: activeWorkspaceId,
      uploaded_by: user.id,
      title: file.name,
      file_path: storagePath,
      mime_type: file.type,
      status: "uploaded",
    });

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Attempt storage rollback on db failure
      await supabase.storage.from("documents").remove([storagePath]);
      return { error: `Failed to save document metadata: ${dbError.message}` };
    }

    // 7. Track usage event
    await supabase.from("usage_events").insert({
      workspace_id: activeWorkspaceId,
      user_id: user.id,
      event_type: "document_uploaded",
      quantity: 1,
      metadata: { filename: file.name, size: file.size },
    });

    // 8. Trigger background ingestion pipeline (non-blocking)
    processDocument(documentId).catch((err) => {
      console.error(`Error in background document processing:`, err);
    });

    revalidatePath("/dashboard/documents");
    return { success: true, error: "" };
  } catch (err: any) {
    console.error("Unhandle upload error:", err);
    return { error: err.message || "An unexpected error occurred." };
  }
}

export async function deleteDocument(documentId: string) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { error: "You must be signed in to delete files." };
    }

    // 2. Fetch document record to retrieve storage path
    const { data: document, error: fetchError } = await supabase
      .from("documents")
      .select("workspace_id, file_path")
      .eq("id", documentId)
      .single();

    if (fetchError || !document) {
      return { error: "Document not found or access denied." };
    }

    // 3. Verify workspace membership
    const { data: membership } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", document.workspace_id)
      .eq("user_id", user.id)
      .single();

    if (!membership) {
      return { error: "You do not have access to this workspace." };
    }

    // 4. Delete from Supabase Storage
    if (document.file_path) {
      const { error: storageError } = await supabase.storage
        .from("documents")
        .remove([document.file_path]);

      if (storageError) {
        console.error("Storage delete error:", storageError);
      }
    }

    // 5. Delete metadata record (Cascades to document_chunks)
    const { error: dbError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentId);

    if (dbError) {
      return { error: `Failed to delete document metadata: ${dbError.message}` };
    }

    revalidatePath("/dashboard/documents");
    return { success: true };
  } catch (err: any) {
    console.error("Unhandled delete error:", err);
    return { error: err.message || "An unexpected error occurred." };
  }
}
