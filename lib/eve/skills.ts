/**
 * Skill loader with progressive disclosure.
 *
 * Ported from `d:\Trading\Vibe-Trading\agent\src\agent\skills.py` (HKUDS,
 * MIT). The idea that matters: the system prompt carries only one-line
 * descriptions, and the full document is fetched on demand — by *named
 * section*, not by blind character paging. A skill corpus large enough to be
 * useful is far too large to inline into every request.
 *
 * Skills live as `lib/eve/skills/<name>/SKILL.md` and are read from disk on
 * first use, then cached for the process lifetime.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIR = join(process.cwd(), "lib", "eve", "skills");

export type Skill = {
  name: string;
  description: string;
  category: string;
  body: string;
};

/**
 * Minimal YAML frontmatter reader.
 *
 * Deliberately not a YAML dependency: these files use exactly three scalar
 * keys, and `description` is always a `>-` folded block. Anything richer
 * belongs in the body.
 */
function parseFrontmatter(raw: string): Skill | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) return null;
  const [, front, body] = match;

  const fields: Record<string, string> = {};
  let key: string | null = null;
  for (const line of front.split(/\r?\n/)) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      // `>-` / `>` / `|` introduce a folded block; the value is on following
      // indented lines.
      fields[key] = /^[>|]-?$/.test(kv[2].trim()) ? "" : kv[2].trim();
    } else if (key && /^\s+\S/.test(line)) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim();
    }
  }

  if (!fields.name) return null;
  return {
    name: fields.name,
    description: fields.description ?? "",
    category: fields.category ?? "other",
    body: body.trim(),
  };
}

let cache: Skill[] | null = null;

export function listSkills(): Skill[] {
  if (cache) return cache;
  let dirs: string[];
  try {
    dirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    // No skills directory is a degraded mode, not a failure: Eve still has
    // its system prompt and the bridge tools.
    cache = [];
    return cache;
  }

  const skills: Skill[] = [];
  for (const dir of dirs) {
    try {
      const parsed = parseFrontmatter(
        readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf8"),
      );
      if (parsed) skills.push(parsed);
    } catch {
      // Skip an unreadable or malformed skill rather than breaking the chat.
    }
  }
  cache = skills.sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

export function getSkill(name: string): Skill | undefined {
  return listSkills().find((s) => s.name === name);
}

/** One line per skill, for the system prompt. */
export function skillDescriptions(): string {
  const skills = listSkills();
  if (skills.length === 0) return "";
  return skills.map((s) => `- ${s.name}: ${s.description}`).join("\n");
}

export type Section = { heading: string; content: string };

/**
 * Split a skill body on its `##` headings.
 *
 * Returning named sections is the whole point: the model can ask for "Costs"
 * instead of reading pages 1..n to reach it.
 */
export function splitSections(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const sections: Section[] = [];
  let heading = "(intro)";
  let buffer: string[] = [];

  const flush = () => {
    const content = buffer.join("\n").trim();
    if (content) sections.push({ heading, content });
    buffer = [];
  };

  for (const line of lines) {
    const h = /^##\s+(.*)$/.exec(line);
    if (h) {
      flush();
      heading = h[1].trim();
    } else {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

/** Heading list plus the intro — what a `load_skill` call returns with no section. */
export function skillSkeleton(skill: Skill): {
  skill: string;
  sections: string[];
  intro: string;
} {
  const sections = splitSections(skill.body);
  return {
    skill: skill.name,
    sections: sections.map((s) => s.heading).filter((h) => h !== "(intro)"),
    intro: sections.find((s) => s.heading === "(intro)")?.content ?? "",
  };
}
