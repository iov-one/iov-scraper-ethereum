export function help(): void {
  const out = `
Usage: iov-scraper-ethereum action [arguments...]

Positional arguments per action are listed below. Arguments in parentheses are optional.

help      Shows a help text and exits

version   Prints the version and exits

start     Starts the scraper
           1  Ganache base URL, e.g. http://localhost:8545

Environment variables

SCRAPER_PORT              Port of the webserver. Defaults to 8546.
`.trim();

  process.stdout.write(`${out}\n`);
}
