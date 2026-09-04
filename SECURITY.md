# Security

Report vulnerabilities privately to the repository maintainers through
GitHub's private vulnerability reporting surface. Do not open a public issue
with an exploit or user data.

Nightfire treats markdown, embedded HTML, URLs, block payloads, and version
identifiers as untrusted input. Rendering must sanitize HTML in SSR and DOM
runtimes. Validation must fail closed for unknown versions. Fixtures must use
synthetic data only.
