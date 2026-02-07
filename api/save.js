export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const body = req.body || {};
    const mapIdRaw = String(body.mapId || "rdo_main");
    const mapId = mapIdRaw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || "rdo_main";
    const payload = body.payload;

    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "Missing payload object" });
    }

    const OWNER = process.env.GITHUB_OWNER;
    const REPO = process.env.GITHUB_REPO;
    const BRANCH = process.env.GITHUB_BRANCH || "main";
    const TOKEN = process.env.GITHUB_TOKEN;
    const BASE_PATH = process.env.GITHUB_BASE_PATH || "data/maps";

    // Optional simple protection
    const REQUIRED = process.env.EDITOR_CODE || "";
    const got = String(req.headers["x-editor-code"] || "");
    if (REQUIRED && got !== REQUIRED) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!OWNER || !REPO || !TOKEN) {
      return res.status(500).json({ error: "Missing env vars (GITHUB_OWNER/REPO/TOKEN)" });
    }

    const path = `${BASE_PATH}/${mapId}.json`;
    const apiBase = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;

    // Wrap so load.js can return payload cleanly
    const contentObj = {
      mapId,
      updatedAt: new Date().toISOString(),
      payload
    };
    const contentStr = JSON.stringify(contentObj, null, 2);
    const contentB64 = Buffer.from(contentStr, "utf8").toString("base64");

    // Get current sha (if exists)
    let sha = undefined;
    const getResp = await fetch(`${apiBase}?ref=${encodeURIComponent(BRANCH)}`, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "rdrmap-vercel-api",
      },
    });

    if (getResp.status === 200) {
      const existing = await getResp.json();
      sha = existing.sha;

      // Skip commit if identical
      if (existing.content) {
        const existingText = Buffer.from(String(existing.content).replace(/\n/g, ""), "base64").toString("utf8");
        if (existingText.trim() === contentStr.trim()) {
          return res.status(200).json({ ok: true, skipped: true });
        }
      }
    } else if (getResp.status !== 404) {
      const t = await getResp.text();
      return res.status(500).json({ error: "GitHub read failed", details: t });
    }

    const putBody = {
      message: body.message || `Auto-save ${mapId}`,
      content: contentB64,
      branch: BRANCH,
      ...(sha ? { sha } : {})
    };

    const putResp = await fetch(apiBase, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "rdrmap-vercel-api",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putBody),
    });

    if (!putResp.ok) {
      const t = await putResp.text();
      return res.status(500).json({ error: "GitHub write failed", details: t });
    }

    const out = await putResp.json();
    return res.status(200).json({ ok: true, skipped: false, commit: out?.commit?.sha || null });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

