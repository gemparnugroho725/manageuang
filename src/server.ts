import express from "express";
import path from "path";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { transactionsRouter } from "./routes/transactions";
import { walletsRouter } from "./routes/wallets";
import { authRouter } from "./routes/auth";

dotenv.config();

const app = express();

app.use(express.json());

// Auth endpoints (no auth required)
app.use("/api", authRouter);

// Simple JWT middleware for local dev
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  try {
    const auth = req.headers['authorization'] || req.headers['Authorization'] as string | undefined;
    if (!auth || !auth.toString().startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
    const token = auth.toString().slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server not configured' });
    jwt.verify(token, secret, { algorithms: ['HS256'] });
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Protected API
app.use("/api/transactions", requireAuth, transactionsRouter);
app.use("/api/wallets", requireAuth, walletsRouter);
// Protect only the /api/auth-code path while keeping other auth endpoints open
app.use("/api/auth-code", requireAuth);

// Static frontend
app.use(express.static(path.join(__dirname, "../public")));

// ✅ CATCH-ALL UNTUK FRONTEND (EXPRESS 5 SAFE)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(3000, () => {
  console.log("Expense Manager running on http://localhost:3000");
});

