import { httpError, HttpError } from "../../src/utils/httpError";

describe("httpError", () => {
  it("returns an Error instance with the given message", () => {
    const err = httpError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Not found");
  });

  it("attaches the provided status code", () => {
    const err = httpError(403, "Forbidden");
    expect(err.statusCode).toBe(403);
  });

  it("attaches an optional machine-readable code", () => {
    const err = httpError(409, "Already exists", "EMAIL_ALREADY_EXISTS");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("omits the code when not provided", () => {
    const err = httpError(400, "Bad request");
    expect(err.code).toBeUndefined();
  });

  it("preserves a stack trace", () => {
    const err = httpError(500, "Boom");
    expect(typeof err.stack).toBe("string");
    expect(err.stack).toContain("Boom");
  });

  it("produces independent error objects", () => {
    const a = httpError(400, "a");
    const b = httpError(401, "b");
    expect(a).not.toBe(b);
    expect(a.statusCode).toBe(400);
    expect(b.statusCode).toBe(401);
  });

  it("is assignable to the HttpError type", () => {
    const err: HttpError = httpError(422, "Unprocessable");
    expect(err.statusCode).toBe(422);
  });
});
