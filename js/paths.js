export function pageHref(file) {
  return new URL(file, new URL("./", location.href)).href;
}

export function isGitHubPages() {
  return location.hostname.endsWith("github.io");
}
