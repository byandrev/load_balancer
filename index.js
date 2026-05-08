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
  }),
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

const handlerSubmit = async (
  code,
  language,
  input,
  timeout,
  memoryLimit,
  callback_url,
  expected,
  res,
) => {
  let server = SERVERS[current];

  SERVERS_LOAD[current].count += 1;
  current === SERVERS.length - 1 ? (current = 0) : current++;

  console.log("Using server: " + server);

  try {
    const response = await axios({
      url: `${server}/submit`,
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: new URLSearchParams({
        code: code,
        language: language,
        input: input,
        timeout: timeout,
        memoryLimit: memoryLimit,
        callback_url: callback_url,
        expected: expected,
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

  SERVERS_LOAD[current].count += 1;
  current === SERVERS.length - 1 ? (current = 0) : current++;

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

/*
 * Body params:
 *   - language (string, required): Lenguaje de programación (py, js, cpp, c, java, cs, go)
 *   - code (string, required): Código a ejecutar
 *   - input (string, optional): Input para el código
 *   - timeout (number, optional): Timeout en segundos (1-60, default: config.TIMEOUT)
 *   - memoryLimit (number, optional): Límite de memoria en MB (1-2048, default: config.MEMORY_LIMIT)
 *   - callback_url (string, optional): URL para recibir el resultado cuando termine
 *   - expected (string, optional): Output esperado para comparar con el resultado
 */
app.post("/submit", (req, res) => {
  const {
    code,
    language,
    input,
    timeout,
    memoryLimit,
    callback_url,
    expected,
  } = req.body;

  return handlerSubmit(
    code,
    language,
    input,
    timeout,
    memoryLimit,
    callback_url,
    expected,
    res,
  );
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
