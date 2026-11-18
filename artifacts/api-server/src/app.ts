import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.set("trust proxy", 1); // trusted reverse proxies (nginx) pass remote addresses

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/api", router);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Always answer with JSON. Without this, a thrown ZodError, malformed body, or
// local-LLM outage would surface as an HTML 500 page, which the frontend cannot
// parse and which makes local troubleshooting much harder.
app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  let status = Number(err?.status ?? err?.statusCode);
  let message = err?.message ?? "Internal server error";

  if (!Number.isInteger(status) || status < 400 || status > 599) {
    if (err?.name === "ZodError" || Array.isArray(err?.issues)) {
      status = 400;
      message = "Invalid request body";
    } else if (err?.type === "entity.parse.failed") {
      status = 400;
      message = "Malformed JSON body";
    } else if (err?.kind === "unavailable") {
      status = 503;
    } else {
      status = 500;
    }
  }

  if (status >= 500) {
    logger.error({ err }, "Unhandled request error");
  }

  res.status(status).json({
    error: message,
    ...(Array.isArray(err?.issues) ? { issues: err.issues } : {}),
  });
});

export default app;