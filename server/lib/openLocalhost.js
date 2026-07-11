import open from "open";

export const openLocalhost = async (url) => {
  try {
    await open(url);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Kunde inte öppna webbläsaren automatiskt: ${message}`);
    return false;
  }
};
