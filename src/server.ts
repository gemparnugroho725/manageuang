import express from "express";
import path from "path";
import dotenv from "dotenv";
import { transactionsRouter } from "./routes/transactions";
import { walletsRouter } from "./routes/wallets";

dotenv.config();

const app = express();

app.use(express.json());

// API
app.use("/api/transactions", transactionsRouter);
app.use("/api/wallets", walletsRouter);

// Static frontend
app.use(express.static(path.join(__dirname, "../public")));

// ✅ CATCH-ALL UNTUK FRONTEND (EXPRESS 5 SAFE)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(3000, () => {
  console.log("Expense Manager running on http://localhost:3000");
});

