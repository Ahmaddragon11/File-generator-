import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { FileMetadata } from "./src/types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(process.cwd(), "files-db.json");

// Helper to read DB safely
function readDb(): FileMetadata[] {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(data) as FileMetadata[];
    }
  } catch (error) {
    console.error("Error reading database file:", error);
  }
  return [];
}

// Helper to write DB safely
function writeDb(data: FileMetadata[]) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing database file:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON parsing middleware
  app.use(express.json());

  // API Endpoints

  // 1. Get all file metadata
  app.get("/api/files", (req, res) => {
    try {
      const db = readDb();
      res.json(db);
    } catch (err) {
      console.error("Failed to read database:", err);
      res.status(500).json({ error: "Failed to read database" });
    }
  });

  // 1b. Get secure single file metadata (hiding actual password string)
  app.get("/api/files/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = readDb();
      const file = db.find((f) => f.id === id);
      if (!file) {
        return res.status(404).json({ error: "File not found / الملف غير موجود" });
      }

      const secureFile = {
        ...file,
        passwordProtected: !!file.password,
        password: undefined // Omit original raw password to guard credentials
      };
      res.json(secureFile);
    } catch (err) {
      console.error("Failed to fetch file details:", err);
      res.status(500).json({ error: "Failed to get file details" });
    }
  });

  // 2. Create new file metadata
  app.post("/api/files", (req, res) => {
    try {
      const { name, extension, size, unit, type, customText, maxDownloads, password } = req.body;
      if (!name || !extension || size === undefined || !unit || !type) {
        return res.status(400).json({ error: "Missing required fields / بيانات ناقصة" });
      }

      // Generate a secure unique ID
      const randomId = Math.random().toString(36).substring(2, 10) + Date.now().toString(36).substring(4);
      const cleanId = `file-${randomId}`;

      // Filter characters for clean filenames but allow space and Arabic
      const sanitizedName = name.trim().replace(/[/\\?%*:|"<>\x00-\x1F]/g, "") || "untitled";
      const sanitizedExt = extension.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";

      const newFile: FileMetadata = {
        id: cleanId,
        name: sanitizedName,
        extension: sanitizedExt,
        size: Number(size),
        unit,
        type,
        customText: customText || "",
        createdAt: new Date().toISOString(),
        downloadCount: 0,
        maxDownloads: maxDownloads ? Number(maxDownloads) : undefined,
        password: password || undefined,
        downloadHistory: []
      };

      const db = readDb();
      db.unshift(newFile); // Prepend to the file list
      writeDb(db);

      res.status(201).json(newFile);
    } catch (err) {
      console.error("Error generating file metadata:", err);
      res.status(500).json({ error: "Failed to generate metadata" });
    }
  });

  // 2b. Edit existing file metadata
  app.put("/api/files/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { name, extension, size, unit, type, customText, maxDownloads, password } = req.body;
      
      const db = readDb();
      const fileIndex = db.findIndex((f) => f.id === id);
      
      if (fileIndex === -1) {
        return res.status(404).json({ error: "File not found / الملف غير موجود" });
      }

      const file = db[fileIndex];
      
      if (name) file.name = name.trim().replace(/[/\\?%*:|"<>\x00-\x1F]/g, "") || file.name;
      if (extension) file.extension = extension.trim().toLowerCase().replace(/[^a-z0-9]/g, "") || file.extension;
      if (size !== undefined) {
        file.size = Number(size);
        file.unit = unit || file.unit;
      }
      if (type) file.type = type;
      if (customText !== undefined) file.customText = customText;
      
      // Update advanced properties
      file.maxDownloads = maxDownloads ? Number(maxDownloads) : undefined;
      file.password = password || undefined;

      writeDb(db);
      res.json(file);
    } catch (err) {
      console.error("Failed to edit file metadata:", err);
      res.status(500).json({ error: "Failed to edit file metadata" });
    }
  });

  // 2c. Verify file password API
  app.post("/api/verify-password/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.body;
      const db = readDb();
      const file = db.find((f) => f.id === id);
      
      if (!file) {
        return res.status(404).json({ error: "File not found / الملف غير موجود" });
      }

      if (!file.password) {
        return res.json({ valid: true }); // No password set
      }

      const isValid = file.password === password;
      res.json({ valid: isValid });
    } catch (err) {
      console.error("Failed to verify password:", err);
      res.status(500).json({ error: "Error verifying password" });
    }
  });

  // 3. Delete file metadata
  app.delete("/api/files/:id", (req, res) => {
    try {
      const { id } = req.params;
      const db = readDb();
      const updated = db.filter((f) => f.id !== id);
      writeDb(updated);
      res.json({ success: true });
    } catch (err) {
      console.error("Failed to delete file metadata:", err);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // 4. Download file (On-The-Fly Data Streaming!)
  app.get("/api/download/:id", (req, res) => {
    try {
      const { id } = req.params;
      const { password } = req.query;
      
      const db = readDb();
      const fileIndex = db.findIndex((f) => f.id === id);
      if (fileIndex === -1) {
        return res.status(404).send("File not found / الملف غير موجود");
      }

      const file = db[fileIndex];

      // A. Check Password Protection
      if (file.password && file.password !== password) {
        return res.status(401).send("Password Required / هذا الملف محمي برمز مرور. يرجى تمرير الكلمة الصحيحة لتحميل الملف.");
      }

      // B. Check Max Downloads / Self-Destruct
      if (file.maxDownloads && file.maxDownloads > 0 && file.downloadCount >= file.maxDownloads) {
        // Automatically purge from DB to fulfill self-destruct
        const updated = db.filter((f) => f.id !== id);
        writeDb(updated);
        return res.status(410).send("Expired & Self-Destructed / تم تدمير وحذف هذا الملف تلقائياً لتجاوزه الحد الأقصى من التحميلات المسموحة!");
      }

      // C. Record download event
      file.downloadCount = (file.downloadCount || 0) + 1;
      
      // Mask IP for safety
      const forwardHeader = req.headers["x-forwarded-for"];
      const rawIp = typeof forwardHeader === "string" ? forwardHeader.split(",")[0] : (req.socket.remoteAddress || "127.0.0.1");
      const cleanIp = rawIp.replace(/(:\d+$)/, "").replace(/(\d+)\.(\d+)$/, "xxx.xxx");

      const speedSample = Math.floor(Math.random() * 150 + 20); // Simulated download Speed Sample in Mbps
      
      const historyEvent = {
        timestamp: new Date().toISOString(),
        speedMbps: speedSample,
        ipIndicator: cleanIp
      };

      file.downloadHistory = file.downloadHistory || [];
      file.downloadHistory.unshift(historyEvent);
      if (file.downloadHistory.length > 30) {
        file.downloadHistory = file.downloadHistory.slice(0, 30);
      }

      // Save to database
      writeDb(db);

      const filename = `${file.name}.${file.extension}`;
      let contentType = "application/octet-stream";
      
      const ext = file.extension.toLowerCase();
      if (ext === "txt") contentType = "text/plain; charset=utf-8";
      else if (ext === "pdf") contentType = "application/pdf";
      else if (ext === "zip") contentType = "application/zip";
      else if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
      else if (ext === "png") contentType = "image/png";
      else if (ext === "mp3") contentType = "audio/mpeg";
      else if (ext === "mp4") contentType = "video/mp4";
      else if (ext === "json") contentType = "application/json";
      else if (ext === "html") contentType = "text/html; charset=utf-8";

      // Set headers for browsers to download immediately with proper size
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader("Content-Length", file.size);
      res.setHeader("Content-Type", contentType);

      // Backpressure-friendly chunked streamer
      const chunkSize = 128 * 1024; // 128KB chunks
      let bytesRemaining = file.size;

      // Prepare chunk contents based on the requested generation mode
      let chunkBuffer: Buffer;
      if (file.type === "zeros") {
        chunkBuffer = Buffer.alloc(chunkSize, 0);
      } else if (file.type === "custom") {
        const textPattern = file.customText || "dummy data ";
        const patternBuf = Buffer.from(textPattern, "utf-8");
        // Create repeating pattern buffer
        const repeatTimes = Math.ceil(chunkSize / patternBuf.length);
        const hugeBuf = Buffer.concat(Array(repeatTimes).fill(patternBuf));
        chunkBuffer = hugeBuf.subarray(0, chunkSize);
      } else {
        // Random alphanumeric printable content
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789\n\r ";
        const randomPool = Buffer.alloc(256 * 1024); // 256KB pool to keep cycle fast and lightweight
        for (let i = 0; i < randomPool.length; i++) {
          randomPool[i] = characters.charCodeAt(Math.floor(Math.random() * characters.length));
        }
        chunkBuffer = randomPool.subarray(0, chunkSize);
      }

      function writeNext() {
        let canWrite = true;
        while (bytesRemaining > 0 && canWrite) {
          const currentWriteSize = Math.min(bytesRemaining, chunkSize);
          let buf = chunkBuffer;
          
          if (currentWriteSize < chunkSize) {
            buf = chunkBuffer.subarray(0, currentWriteSize);
          }

          bytesRemaining -= currentWriteSize;

          if (bytesRemaining === 0) {
            res.end(buf);
            return;
          } else {
            canWrite = res.write(buf);
          }
        }

        if (bytesRemaining > 0) {
          res.once("drain", writeNext);
        }
      }

      writeNext();

    } catch (err) {
      console.error("Error streaming file:", err);
      if (!res.headersSent) {
        res.status(500).send("Internal server error during download streaming");
      }
    }
  });

  // Integrate Vite dev server middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer();
