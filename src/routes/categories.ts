import { Router } from "express";
import { supabase } from "../db";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data || []);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

categoriesRouter.post("/", async (req, res) => {
  try {
    const name = String((req.body?.name || "")).trim();
    if (!name) return res.status(400).json({ error: "Name required" });

    // Check existing
    const { data: existing, error: selErr } = await supabase
      .from("categories")
      .select("id, name")
      .ilike("name", name)
      .limit(1);
    if (selErr) return res.status(500).json({ error: selErr.message });
    if (existing && existing[0]) return res.json(existing[0]);

    const { data, error } = await supabase
      .from("categories")
      .insert([{ name }])
      .select("id, name")
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.json(data);
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

categoriesRouter.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid id" });
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});
