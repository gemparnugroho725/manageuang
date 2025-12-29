import { Router } from "express";
import { supabase } from "../db";

export const titlesRouter = Router();

titlesRouter.get("/", async (req, res) => {
  try {
    const type = (req.query?.type as string) || "";
    let query = supabase.from("titles").select("id, name").order("name", { ascending: true });
    let { data, error } = type ? await query.eq("type", type) : await query;
    if (error && String(error.message).includes("'type' column")) {
      ({ data, error } = await supabase.from("titles").select("id, name").order("name", { ascending: true }));
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

titlesRouter.post("/", async (req, res) => {
  try {
    const name = String((req.body?.name || "")).trim();
    const type = String((req.body?.type || "")).trim();
    if (!name) return res.status(400).json({ error: "Name required" });

    // Check existing (case-insensitive)
    let sel = supabase.from("titles").select("id, name, type").ilike("name", name).limit(1);
    const { data: existing, error: selErr } = await sel;
    if (selErr) return res.status(500).json({ error: selErr.message });
    if (existing && existing[0]) {
      if (!type || !existing[0].type || existing[0].type === type) return res.json({ id: existing[0].id, name: existing[0].name });
      // else allow create same name for different type
    }

    let ins = [{ name } as any];
    if (type) (ins[0] as any).type = type;
    let { data, error } = await supabase.from("titles").insert(ins).select("id, name").single();
    if (error && String(error.message).includes("'type' column")) {
      // retry without type
      ({ data, error } = await supabase.from("titles").insert([{ name }]).select("id, name").single());
    }
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

titlesRouter.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const { error } = await supabase.from("titles").delete().eq("id", id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});
