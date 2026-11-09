export function escapeMarkdown(value: unknown): string {
  return String(value).replace(/\r/g," ").replace(/\n/g," ").replace(/\|/g,"\\|").slice(0,300);
}
