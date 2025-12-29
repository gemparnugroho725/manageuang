import { Router } from "express";
import { supabase } from "../db";

export const transactionsRouter = Router();

transactionsRouter.get("/", async (_, res) => {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('id', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

transactionsRouter.post("/", async (req, res) => {
  const { type, amount, note, date, wallet_id } = req.body;

  if (!type || !amount || !date) {
    return res.status(400).json({ error: "Invalid data" });
  }

  const payload: any = { type, amount, note: note ?? "", date };
  if (wallet_id) payload.wallet_id = Number(wallet_id);

  const { error } = await supabase
    .from('transactions')
    .insert([payload]);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* UPDATE TRANSACTION */
transactionsRouter.put("/:id", async (req, res) => {
  const { type, amount, note, date, wallet_id } = req.body;
  const updates: any = {};
  if (type !== undefined) updates.type = type;
  if (amount !== undefined) updates.amount = amount;
  if (note !== undefined) updates.note = note ?? "";
  if (date !== undefined) updates.date = date;
  if (wallet_id !== undefined) updates.wallet_id = Number(wallet_id);

  const { error } = await supabase
    .from('transactions')
    .update(updates)
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

/* DELETE TRANSACTION */
transactionsRouter.delete("/:id", async (req, res) => {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});
