import crypto from "crypto";

function b64url(buf){ return Buffer.from(buf).toString("base64").replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
function verifySession(token, secret){
  const [p,s] = String(token||"").split(".");
  if(!p||!s) return null;
  const json = Buffer.from(p.replace(/-/g,"+").replace(/_/g,"/"), "base64").toString("utf8");
  const expected = b64url(crypto.createHmac("sha256", secret).update(json).digest());
  if(expected !== s) return null;
  return JSON.parse(json);
}
function getCookie(req, name){
  const raw = req.headers.cookie || "";
  const m = raw.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export default function handler(req, res){
  const secret = process.env.SESSION_SECRET;
  if(!secret) return res.status(500).json({ error:"Missing SESSION_SECRET" });

  const tok = getCookie(req, "rp_session");
  if(!tok) return res.status(200).json({ user:null, canEdit:false });

  const session = verifySession(tok, secret);
  if(!session) return res.status(200).json({ user:null, canEdit:false });

  return res.status(200).json({
    user: { id: session.id, username: session.username, avatar: session.avatar },
    canEdit: !!session.canEdit
  });
}
