import { Configuration, OpenAIApi } from "openai";
import sqlite3 from "sqlite3";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

const db = new sqlite3.Database('embedding_database.db');
const app = express();
const port = 3000;
const API_KEY = "<OPENAI-API-KEY>";

app.use(bodyParser.json());
app.use(cors());

const configuration = new Configuration({
  apiKey: API_KEY
});
const openai = new OpenAIApi(configuration);

app.post("/chats", async (req, res) => {
  
  const { chats } = req.body;

  const result = await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "you may help me with your response",
      },
      ...chats,
    ],
  });

  res.json({
    output: result.data.choices[0].message,
  });
});

app.post('/embedPDFfile', async (req, res) => {
  const pdfText = req.body.pdfText;

  const openaiResponse = await openai.Embed.create({
    model: 'text-davinci-003',
    data: [{ text: pdfText }],
  });

  const embedding = openaiResponse.data[0].embedding;

  db.run('INSERT INTO embeddings (embedding) VALUES (?)', [embedding], (err) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      res.json({ success: true });
    }
  });
});

app.post('/queryResponses', async (req, res) => {
  const userQuery = req.body.userQuery;

  const queryResponse = await openai.Embed.create({
    model: 'text-davinci-003',
    data: [{ text: userQuery }],
  });

  const queryEmbedding = queryResponse.data[0].embedding;

  db.all('SELECT embedding FROM embeddings ORDER BY ABS(?) - ABS(embedding) LIMIT 5', [queryEmbedding], (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal Server Error' });
    } else {
      const similarEmbeddings = rows.map(row => row.embedding);
      res.json({ similarEmbeddings });
    }
  });
});

app.listen(port, () => {
  console.log(`listening on port ${port}...`);
});
