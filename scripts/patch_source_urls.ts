import fs from "node:fs";
import path from "node:path";

type U = { subject:{id:string}, evidence:{source_url:string} };

const schoolUrl: Record<string,string> = {
  "Hazelwood Central Sr High School":
    "https://pressagent.envisionconnect.com/insp.phtml?agency=STL&record_id=PR0003910",
  // add more as you ingest:
  // "Clayton High School": "https://pressagent.envisionconnect.com/insp.phtml?agency=STL&record_id=PRXXXXXXX",
  // "Ladue Horton Watkins High School": "https://pressagent.envisionconnect.com/insp.phtml?agency=STL&record_id=PRXXXXXXX",
};

const dir = "fixtures/ingest";
for (const f of fs.readdirSync(dir).filter(x=>x.endsWith(".json"))) {
  const p = path.join(dir, f);
  const j = JSON.parse(fs.readFileSync(p,"utf8")) as U;
  const url = schoolUrl[j.subject.id];
  if (!url) continue;
  j.evidence.source_url = url;
  fs.writeFileSync(p, JSON.stringify(j,null,2));
  console.log("patched", f);
}
