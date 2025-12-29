import { Router } from "express";
import { supabase } from "../db";

export const walletsRouter = Router();

/* GET ALL WALLETS */
walletsRouter.get("/", async (_, res) => {
  const { data, error } = await supabase
    .from('wallets')
    .select('*');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

/* ADD WALLET */
walletsRouter.post("/", async (req, res) => {
  const { name, balance } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const { error } = await supabase
    .from('wallets')
    .insert([{ name, balance: balance || 0 }]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* UPDATE WALLET */
walletsRouter.put("/:id", async (req, res) => {
  const { name, balance } = req.body;
  const { error } = await supabase
    .from('wallets')
    .update({ name, balance })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* DELETE WALLET */
walletsRouter.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('wallets')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    // Likely foreign key constraint if there are transactions
    return res.status(400).json({ error: error.message });
  }
  res.json({ success: true });
});
