require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.ORIGINS || "*",
  })
);

const PORT = process.env.PORT || 8080;
const SERVERS = process.env.SERVERS.split(",") || [];
const SERVERS_LOAD = SERVERS.map((server) => {
  return { name: server, count: 0 };
});

let current = 0;

const ABORT_TIME_OUT = process.env.ABORT_TIME_OUT * 1000 || 5000;

function newAbortSignal(timeoutMs) {
  const abortController = new AbortController();
  setTimeout(() => abortController.abort(), timeoutMs || 0);
  return abortController.signal;
}

const handlerSubmit = async (code, language, input, res) => {
  let server = SERVERS[current];

  if (
    language === "cpp" ||
    language === "cpp17" ||
    language === "cpp20" ||
    language === "c" ||
    language === "cs"
  ) {
    SERVERS_LOAD[current].count += 1;
    current === SERVERS.length - 1 ? (current = 0) : current++;
  } else {
    server = "https://rpcide-executer-1.fly.dev";
  }

  console.log("Using server: " + server);

  try {
    const response = await axios({
      url: `${server}/`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({
        code: code,
        language: language,
        input: input,
      }),
      signal: newAbortSignal(ABORT_TIME_OUT),
    });
    res.json(response.data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error", timestamp: Date.now() });
  }
};

const handlerFormat = async (body, res) => {
  let server = SERVERS[current];

  if (!body.code || !body.language) {
    return res.status(400).json({
      error: "Field code and language is required",
      timestamp: Date.now(),
    });
  }

  if (
    body.language === "cpp" ||
    body.language === "cpp17" ||
    body.language === "cpp20" ||
    body.language === "c" ||
    body.language === "cs"
  ) {
    SERVERS_LOAD[current].count += 1;
    current === SERVERS.length - 1 ? (current = 0) : current++;
  } else {
    server = "https://rpcide-executer-1.fly.dev";
  }

  console.log("Using server: " + server);

  try {
    const response = await axios({
      url: `${server}/format`,
      method: "POST",
      data: {
        code: body.code,
        language:
          body.language === "c" || body.language === "cs"
            ? "cpp"
            : body.language,
        options: body.options,
      },
      signal: newAbortSignal(ABORT_TIME_OUT),
    });
    res.json(response.data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error", timestamp: Date.now() });
  }
};

app.get("/", (_, res) => {
  res.send("Hello");
});

app.get("/servers", (_, res) => {
  res.json({ SERVERS });
});

app.post("/submit", (req, res) => {
  const { code, language, input } = req.body;
  return handlerSubmit(code, language, input, res);
});

app.post("/format", (req, res) => {
  return handlerFormat(req.body, res);
});

app.get("/load", (_, res) => {
  res.json({ SERVERS_LOAD });
});

app.listen(PORT, () => {
  console.log("Server listening");
});
