export function pageHref(file) {
  const url = new URL(location.href);
  let path = url.pathname;
  if (path.endsWith(".html")) {
    path = path.slice(0, path.lastIndexOf("/") + 1);
  } else if (!path.endsWith("/")) {
    path += "/";
  }
  return `${url.origin}${path}${file}`;
}

export function isGitHubPages() {
  return location.hostname.endsWith("github.io");
}
