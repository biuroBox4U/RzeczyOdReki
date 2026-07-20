const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const CONFIG_PATH = path.join(__dirname, "config.json");

let config = {
  jsonFilePath: "../Rzeczy_Od_Reki_Baza_Produtow.json",
  imagesDirPath: "../images",
  githubUser: "23Banzaj",
  githubRepo: "InfoMatyka",
  githubBranch: "main",
  imageNamingPattern: "[id]_[index]",
  bloggerProductBaseUrl: "https://www.rzeczyodreki.pl/p/produkt.html",
};

function runCmd(cmd, cwd = __dirname) {
  return new Promise((resolve) => {
    exec(cmd, { cwd }, (error, stdout, stderr) => {
      resolve({
        success: !error,
        error: error ? error.message : null,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      });
    });
  });
}

async function autoDetectGit() {
  try {
    const remoteRes = await runCmd("git remote -v");
    if (remoteRes.success && remoteRes.stdout) {
      const match = remoteRes.stdout.match(/github\.com[/:]([^/]+)\/([^.\s]+)/);
      if (match) {
        config.githubUser = match[1];
        config.githubRepo = match[2];
        console.log(
          `[Git Auto] Detected GitHub: ${config.githubUser}/${config.githubRepo}`,
        );
      }
    }

    const branchRes = await runCmd("git branch --show-current");
    if (branchRes.success && branchRes.stdout) {
      config.githubBranch = branchRes.stdout;
      console.log(`[Git Auto] Detected Branch: ${config.githubBranch}`);
    }
  } catch (err) {
    console.error(
      "[Git Auto] Failed to autodetect Git parameters:",
      err.message,
    );
  }
}

function loadConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
      config = { ...config, ...saved };
      console.log("Loaded config from config.json");
    } catch (err) {
      console.error("Error reading config.json, using defaults:", err.message);
    }
  } else {
    autoDetectGit().then(() => {
      saveConfig(config);
    });
  }
}

function saveConfig(newConfig) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2), "utf8");
    config = newConfig;
    console.log("Saved config to config.json");
    return true;
  } catch (err) {
    console.error("Failed to save config:", err.message);
    return false;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.resolve(__dirname, config.imagesDirPath);
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, "temp_" + Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

app.get("/api/config", (req, res) => {
  res.json(config);
});

app.post("/api/config", (req, res) => {
  if (saveConfig(req.body)) {
    res.json({ success: true, config });
  } else {
    res.status(500).json({ success: false, error: "Could not save config" });
  }
});

app.get("/api/products", (req, res) => {
  const filePath = path.resolve(__dirname, config.jsonFilePath);
  if (!fs.existsSync(filePath)) {
    return res.json([]);
  }
  try {
    const rawData = fs.readFileSync(filePath, "utf8");
    const data = JSON.parse(rawData);
    res.json(data);
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        error: "Error reading JSON file: " + err.message,
      });
  }
});

app.post("/api/products", (req, res) => {
  const filePath = path.resolve(__dirname, config.jsonFilePath);
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2), "utf8");
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        error: "Error writing JSON file: " + err.message,
      });
  }
});

app.get("/api/git-head-products", async (req, res) => {
  const projectDir = path.resolve(__dirname, "..");
  
  let gitRoot = projectDir;
  const gitRootRes = await runCmd("git rev-parse --show-toplevel", projectDir);
  if (gitRootRes.success && gitRootRes.stdout) {
    gitRoot = path.resolve(gitRootRes.stdout.trim());
  }

  const jsonPathRelative = path.relative(
    gitRoot,
    path.resolve(__dirname, config.jsonFilePath),
  ).replace(/\\/g, "/");

  const cmd = `git show HEAD:"${jsonPathRelative}"`;
  const result = await runCmd(cmd, gitRoot);
  if (result.success) {
    try {
      const data = JSON.parse(result.stdout);
      res.json(data);
    } catch (err) {
      res.json([]);
    }
  } else {
    res.json([]);
  }
});

app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file uploaded" });
  }

  const { productId, index } = req.body;
  if (!productId || index === undefined) {
    fs.unlinkSync(req.file.path);
    return res
      .status(400)
      .json({ success: false, error: "Missing productId or index" });
  }

  try {
    const ext = path.extname(req.file.originalname).toLowerCase();

    let pattern = config.imageNamingPattern || "[id]_[index]";
    let targetName =
      pattern.replace("[id]", productId).replace("[index]", index) + ext;

    const targetDir = path.resolve(__dirname, config.imagesDirPath);
    const targetPath = path.join(targetDir, targetName);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    fs.renameSync(req.file.path, targetPath);

    const gitRootRes = await runCmd("git rev-parse --show-toplevel");
    let relativeImagesPath = "images";

    if (gitRootRes.success && gitRootRes.stdout) {
      const gitRoot = path.resolve(gitRootRes.stdout);
      const absImagesDir = path.resolve(targetDir);

      let rel = path.relative(gitRoot, absImagesDir).replace(/\\/g, "/");
      if (rel) {
        relativeImagesPath = rel;
      }
    }

    const githubRawUrl = `https://raw.githubusercontent.com/${config.githubUser}/${config.githubRepo}/${config.githubBranch}/${relativeImagesPath}/${targetName}`;

    res.json({
      success: true,
      url: githubRawUrl,
      filename: targetName,
    });
  } catch (err) {
    console.error("Error processing image:", err);
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

const TEMPLATES_PATH = path.join(__dirname, "templates.json");
const DEFAULT_TEMPLATES = [
  {
    name: "Szablon Standardowy (Opis + Lista + Zdjęcie)",
    html: `<p>To jest profesjonalny i funkcjonalny <strong>[Nazwa Produktu]</strong>, w całości wyprodukowany w technologii druku 3D z materiału klasy premium. Łączy nowoczesną estetykę z najwyższą użytecznością.</p>\n\n<h4 class='text-md font-bold mt-6 mb-2'>Główne zalety produktu:</h4>\n<ul class='check-list mb-6'>\n  <li>Specjalnie zaprojektowana konstrukcja o wysokiej ergonomii</li>\n  <li>Wytrzymały materiał o wysokiej odporności na zarysowania</li>\n  <li>Nowoczesny design pasujący do każdego wnętrza</li>\n</ul>\n\n<div class='my-8 rounded-xl overflow-hidden shadow-lg'>\n  <img src='https://images.unsplash.com/photo-155041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=80' class='w-full h-auto'>\n  <p class='text-xs text-center py-2 bg-gray-50 text-gray-500 border-t border-gray-100'>Krótki opis lub podpis pod zdjęciem produktu</p>\n</div>\n\n<p>Dzięki zastosowaniu ekologicznych i niezwykle trwałych materiałów, nasz produkt posłuży Ci przez lata.</p>`,
  },
  {
    name: "Szablon Prosty (Tylko Tekst)",
    html: `<p>Nowoczesny i minimalistyczny <strong>[Nazwa Produktu]</strong> zaprojektowany z myślą o codziennej wygodzie użytkowania. Idealny mariaż estetyki z funkcjonalnością.</p>\n\n<p>Wykonany z dbałością o najmniejsze detale, sprawdzi się doskonale zarówno w domu, jak i w biurze.</p>`,
  },
];

app.get("/api/templates", (req, res) => {
  if (!fs.existsSync(TEMPLATES_PATH)) {
    try {
      fs.writeFileSync(
        TEMPLATES_PATH,
        JSON.stringify(DEFAULT_TEMPLATES, null, 2),
        "utf8",
      );
      return res.json(DEFAULT_TEMPLATES);
    } catch (err) {
      return res.json(DEFAULT_TEMPLATES);
    }
  }
  try {
    const data = JSON.parse(fs.readFileSync(TEMPLATES_PATH, "utf8"));
    res.json(data);
  } catch (err) {
    res.json(DEFAULT_TEMPLATES);
  }
});

app.post("/api/templates", (req, res) => {
  const { name, html } = req.body;
  if (!name || !html) {
    return res
      .status(400)
      .json({ success: false, error: "Missing name or html" });
  }
  let templates = [];
  if (fs.existsSync(TEMPLATES_PATH)) {
    try {
      templates = JSON.parse(fs.readFileSync(TEMPLATES_PATH, "utf8"));
    } catch (err) {
      templates = [...DEFAULT_TEMPLATES];
    }
  } else {
    templates = [...DEFAULT_TEMPLATES];
  }

  const existingIdx = templates.findIndex(
    (t) => t.name.toLowerCase() === name.toLowerCase(),
  );
  if (existingIdx !== -1) {
    templates[existingIdx].html = html;
  } else {
    templates.push({ name, html });
  }

  try {
    fs.writeFileSync(
      TEMPLATES_PATH,
      JSON.stringify(templates, null, 2),
      "utf8",
    );
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/git-status", async (req, res) => {
  const projectDir = path.resolve(__dirname, "..");
  
  let gitRoot = projectDir;
  const gitRootRes = await runCmd("git rev-parse --show-toplevel", projectDir);
  if (gitRootRes.success && gitRootRes.stdout) {
    gitRoot = path.resolve(gitRootRes.stdout.trim());
  }

  let jsonPath = path.resolve(__dirname, config.jsonFilePath);
  let imagesPath = path.resolve(__dirname, config.imagesDirPath);

  if (gitRoot.match(/^[a-zA-Z]:/)) {
    gitRoot = gitRoot.charAt(0).toUpperCase() + gitRoot.slice(1);
  }
  if (jsonPath.match(/^[a-zA-Z]:/)) {
    jsonPath = jsonPath.charAt(0).toUpperCase() + jsonPath.slice(1);
  }
  if (imagesPath.match(/^[a-zA-Z]:/)) {
    imagesPath = imagesPath.charAt(0).toUpperCase() + imagesPath.slice(1);
  }

  const jsonPathRelative = path.relative(gitRoot, jsonPath).replace(/\\/g, "/");
  const imagesPathRelative = path.relative(gitRoot, imagesPath).replace(/\\/g, "/");

  const result = await runCmd("git status --porcelain", gitRoot);
  if (result.success) {
    const files = result.stdout
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const trimmed = line.trim();
        const match = trimmed.match(/^([MADRCU?!]{1,2})\s+(.+)$/);
        if (match) {
          return { code: match[1], file: match[2].replace(/\\/g, "/").trim() };
        }
        return null;
      })
      .filter(Boolean)
      .filter((item) => {
        return (
          item.file === jsonPathRelative ||
          item.file.startsWith(imagesPathRelative + "/") ||
          item.file === imagesPathRelative
        );
      });
    res.json({ success: true, files });
  } else {
    res.status(500).json({ success: false, error: result.error });
  }
});

app.post("/api/git-sync", async (req, res) => {
  const { action, commitMessage } = req.body;
  const projectDir = path.resolve(__dirname, "..");

  if (action === "pull") {
    console.log("[Git Sync] Executing git pull...");
    const result = await runCmd("git pull", projectDir);
    return res.json(result);
  }

  if (action === "push") {
    const msg =
      commitMessage ||
      `Aktualizacja bazy produktów (${new Date().toLocaleString("pl-PL")})`;
    console.log(`[Git Sync] Executing git push with message: "${msg}"`);

    const jsonPathRelative = path.relative(
      projectDir,
      path.resolve(__dirname, config.jsonFilePath),
    );
    const imagesPathRelative = path.relative(
      projectDir,
      path.resolve(__dirname, config.imagesDirPath),
    );

    const addCmd = `git add "${jsonPathRelative}" "${imagesPathRelative}"`;
    console.log(`[Git Sync] Command: ${addCmd}`);
    const addRes = await runCmd(addCmd, projectDir);
    if (!addRes.success) {
      return res
        .status(500)
        .json({ success: false, error: "Git add failed", details: addRes });
    }

    const statusRes = await runCmd("git status --porcelain", projectDir);
    if (!statusRes.stdout) {
      return res.json({
        success: true,
        message: "No changes to commit",
        stdout: "Brak zmian do zatwierdzenia.",
        stderr: "",
      });
    }

    const commitCmd = `git commit -m "${msg.replace(/"/g, '\\"')}"`;
    const commitRes = await runCmd(commitCmd, projectDir);
    if (!commitRes.success) {
      return res
        .status(500)
        .json({
          success: false,
          error: "Git commit failed",
          details: commitRes,
        });
    }

    const pushRes = await runCmd("git push", projectDir);
    if (!pushRes.success) {
      return res
        .status(500)
        .json({ success: false, error: "Git push failed", details: pushRes });
    }

    return res.json({
      success: true,
      stdout: `${addRes.stdout}\n${commitRes.stdout}\n${pushRes.stdout}`.trim(),
      stderr: `${addRes.stderr}\n${commitRes.stderr}\n${pushRes.stderr}`.trim(),
    });
  }

  res.status(400).json({ success: false, error: "Invalid action" });
});

loadConfig();

app.listen(PORT, () => {
  console.log(`Product Database Manager running at http://localhost:${PORT}`);
});
