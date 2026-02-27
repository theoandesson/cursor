import open from "open";

export const openLocalhost = async (url) => {
  try {
    await open(url);
    return true;
  } catch (error) {
    console.warn(`Kunde inte öppna webbläsaren automatiskt: ${error.message}`);
    return false;
  }
};
