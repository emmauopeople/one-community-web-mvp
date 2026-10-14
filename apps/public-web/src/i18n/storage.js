export default {
  async read() {
    try {
      return localStorage.getItem("onecommunity.language");
    } catch {
      return null;
    }
  },
  async write(value) {
    try {
      localStorage.setItem("onecommunity.language", value);
    } catch {}
  },
};
