import type { Request, Response, NextFunction } from "express";
import type { HttpError } from "../../src/utils/httpError";

function createMockResponse() {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = jest.fn().mockImplementation((code: number) => {
    res.statusCode = code;
    return res as Response;
  });
  res.json = jest.fn().mockImplementation((payload: unknown) => {
    res.body = payload;
    return res as Response;
  });
  return res as Response & { statusCode?: number; body?: unknown };
}

describe("errorHandler", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  function loadHandler() {
    return require("../../src/middleware/errorHandler").errorHandler as (
      error: HttpError,
      req: Request,
      res: Response,
      next: NextFunction
    ) => void;
  }

  it("uses the error's statusCode and message", () => {
    process.env.NODE_ENV = "development";
    const errorHandler = loadHandler();
    const res = createMockResponse();
    const err = Object.assign(new Error("Bad request"), { statusCode: 400 });

    errorHandler(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Bad request", error: "Bad request" });
  });

  it("defaults to status 500 when no statusCode is present", () => {
    process.env.NODE_ENV = "development";
    const errorHandler = loadHandler();
    const res = createMockResponse();

    errorHandler(new Error("kaboom") as HttpError, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "kaboom", error: "kaboom" });
  });

  it("masks 500 error messages in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "x";
    process.env.ADMIN_REGISTER_SECRET = "unique-secret";
    const errorHandler = loadHandler();
    const res = createMockResponse();

    errorHandler(new Error("stack detail") as HttpError, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Internal server error", error: "Internal server error" });
  });

  it("does not mask non-500 messages in production", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_SECRET = "x";
    process.env.ADMIN_REGISTER_SECRET = "unique-secret";
    const errorHandler = loadHandler();
    const res = createMockResponse();
    const err = Object.assign(new Error("Unauthorized"), { statusCode: 401 });

    errorHandler(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: "Unauthorized", error: "Unauthorized" });
  });

  it("passes through a machine-readable code when present", () => {
    process.env.NODE_ENV = "development";
    const errorHandler = loadHandler();
    const res = createMockResponse();
    const err = Object.assign(new Error("This email is already registered. Please sign in or use another email address."), {
      statusCode: 409,
      code: "EMAIL_ALREADY_EXISTS",
    });

    errorHandler(err, {} as Request, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: "This email is already registered. Please sign in or use another email address.",
      error: "This email is already registered. Please sign in or use another email address.",
      code: "EMAIL_ALREADY_EXISTS",
    });
  });

  it("omits the code from the response when the error has none", () => {
    process.env.NODE_ENV = "development";
    const errorHandler = loadHandler();
    const res = createMockResponse();

    errorHandler(Object.assign(new Error("nope"), { statusCode: 400 }), {} as Request, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: false, message: "nope", error: "nope" });
  });
});
