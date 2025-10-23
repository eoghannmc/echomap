"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/index.ts
require("dotenv/config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const health_1 = require("./routes/health");
const addressSuggest_1 = require("./routes/addressSuggest");
const addressSuggest_2 = __importDefault(require("./routes/addressSuggest"));
// …
app.use("/api/address", addressSuggest_2.default);
// ---------- Paths / env ----------
const DATA_ROOT = process.env.DATA_ROOT || path_1.default.join(__dirname, '../data');
// ensure the data directory exists so routes depending on it won't crash
try {
    fs_1.default.mkdirSync(DATA_ROOT, { recursive: true });
    console.log('DATA_ROOT:', DATA_ROOT);
}
catch (e) {
    console.error('Failed to create DATA_ROOT', DATA_ROOT, e);
}
// ---------- App ----------
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        /\.vercel\.app$/, // any Vercel preview
    ],
}));
app.use(express_1.default.json());
// ---------- Routes ----------
app.use('/api/health', health_1.healthRouter);
app.use('/api/address-suggest', addressSuggest_1.addressSuggestRouter);
// ---------- Start ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server listening on :${PORT}`);
});
