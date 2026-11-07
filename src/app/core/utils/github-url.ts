export function validateGithubRepositoryUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'A GitHub repository URL is required.';

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return 'Enter a full https://github.com/owner/repository URL.';
  }

  if (url.protocol !== 'https:') return 'Only https GitHub URLs are accepted.';
  if (url.username || url.password) return 'Repository URLs must not include credentials.';
  if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
    return 'Only public github.com repository URLs are supported.';
  }

  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return 'The URL must include an owner and repository name.';
  return null;
}
