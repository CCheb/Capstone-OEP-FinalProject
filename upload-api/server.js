import express from "express";
import fs from "fs";
import path from "path";

const app = express();

// Set the base directory for file operations
const UPLOAD_DIR = "/uploads";

// Ensure the directory exists to prevent runtime errors
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(express.json({ limit: "50mb" }));

// Existing Upload Endpoint
app.post("/upload", (req, res) => {
  const file = req.body.file;
  const base64Data = file.data.replace(/^data:.+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  
  // Use path.basename to secure the filename
  const safeFilename = path.basename(file.name);
  const filepath = path.join(UPLOAD_DIR, safeFilename);
  
  fs.writeFileSync(filepath, buffer);
  
  res.json({
    filename: safeFilename,
    path: filepath
  });
});

// New Endpoint: Get Folder Contents
app.get("/files", (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: "Failed to read directory contents" });
  }
});

// New Endpoint: Delete Selected Contents
app.delete("/files", (req, res) => {
  const filesToDelete = req.body.files;

  // Validate that the request body contains an array of filenames
  if (!Array.isArray(filesToDelete)) {
    return res.status(400).json({ error: "Please provide an array in the 'files' field." });
  }

  const deleted = [];
  const errors = [];

  for (const filename of filesToDelete) {
    // Extract only the filename to prevent path traversal attacks
    const safeFilename = path.basename(filename); 
    const filepath = path.join(UPLOAD_DIR, safeFilename);

    try {
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        deleted.push(safeFilename);
      } else {
        errors.push({ filename: safeFilename, error: "File not found" });
      }
    } catch (err) {
      errors.push({ filename: safeFilename, error: err.message });
    }
  }

  res.json({ 
    message: "Deletion process finished", 
    deleted, 
    errors: errors.length > 0 ? errors : undefined 
  });
});

app.listen(3000, () => {
  console.log("Upload server running on port 3000");
});