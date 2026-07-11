import zlib from "node:zlib";

const MIN_COMPRESS_BYTES = 1024;
const COMPRESSIBLE_TYPES = /^(application\/json|text\/)/i;

const shouldCompress = (body, contentType) => {
  if (!body || body.length < MIN_COMPRESS_BYTES) {
    return false;
  }

  return COMPRESSIBLE_TYPES.test(contentType ?? "");
};

export const compressionSetup = (request, response, next) => {
  const acceptEncoding = request.headers["accept-encoding"] ?? "";
  if (!acceptEncoding.includes("gzip")) {
    next();
    return;
  }

  const originalWrite = response.write.bind(response);
  const originalEnd = response.end.bind(response);
  const chunks = [];

  response.write = (chunk, encoding, callback) => {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    if (typeof callback === "function") {
      callback();
    }
    return true;
  };

  response.end = (chunk, encoding, callback) => {
    if (chunk) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
    }

    const body = Buffer.concat(chunks);
    const contentType = response.getHeader("Content-Type");

    if (!shouldCompress(body, contentType)) {
      response.write = originalWrite;
      response.end = originalEnd;
      originalEnd(body, callback);
      return response;
    }

    zlib.gzip(body, (error, compressed) => {
      if (error) {
        response.write = originalWrite;
        response.end = originalEnd;
        originalEnd(body, callback);
        return;
      }

      response.write = originalWrite;
      response.end = originalEnd;
      response.setHeader("Content-Encoding", "gzip");
      response.setHeader("Vary", "Accept-Encoding");
      response.removeHeader("Content-Length");
      originalEnd(compressed, callback);
    });

    return response;
  };

  next();
};
