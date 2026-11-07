import { validateGithubRepositoryUrl } from './github-url';

describe('validateGithubRepositoryUrl', () => {
  it('accepts a public repository URL', () => {
    expect(validateGithubRepositoryUrl('https://github.com/dotnet/runtime')).toBeNull();
  });

  it('rejects credentials, other hosts, and non-https schemes', () => {
    expect(validateGithubRepositoryUrl('https://user:token@github.com/a/b')).toContain('credentials');
    expect(validateGithubRepositoryUrl('https://github.com.evil.com/a/b')).toContain('github.com');
    expect(validateGithubRepositoryUrl('http://127.0.0.1/a/b')).toContain('https');
    expect(validateGithubRepositoryUrl('file:///etc/passwd')).toContain('https');
  });
});
